/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";

import { SaleFormValues } from "../validation";
import {
  backordersTable,
  customersTable,
  deliveriesTable,
  inventoryTable,
  productsTable,
  promissoryNotesTable,
  quotationsTable,
  saleItemInventoryTable,
  saleItemsTable,
  salesTable,
  storesTable,
} from "@/drizzle/schema";
import {
  PaymentMethod,
  PaymentStatus,
  QuotationStatus,
  SaleBackorder,
  SaleInventoryStock,
  SaleStatus,
} from "@/types";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { SaleFilters } from "@/hooks/useSales";

const buildFilterConditions = (filters: SaleFilters) => {
  const conditions = [];

  conditions.push(eq(salesTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(salesTable.invoiceNumber, searchTerm),
        ilike(customersTable.name, searchTerm),
        ilike(storesTable.name, searchTerm)
      )
    );
  }

  // Total Amount range
  if (filters.totalAmount_min !== undefined) {
    conditions.push(gte(salesTable.totalAmount, filters.totalAmount_min));
  }
  if (filters.totalAmount_max !== undefined) {
    conditions.push(lte(salesTable.totalAmount, filters.totalAmount_max));
  }

  // Amount paid range
  if (filters.amountPaid_min !== undefined) {
    conditions.push(gte(salesTable.amountPaid, filters.amountPaid_min));
  }
  if (filters.amountPaid_max !== undefined) {
    conditions.push(lte(salesTable.amountPaid, filters.amountPaid_max));
  }

  // Sale date range
  if (filters.saleDate_start) {
    conditions.push(gte(salesTable.saleDate, new Date(filters.saleDate_start)));
  }
  if (filters.saleDate_end) {
    conditions.push(lte(salesTable.saleDate, new Date(filters.saleDate_end)));
  }

  // Status filter
  if (filters.status) {
    conditions.push(eq(salesTable.status, filters.status as SaleStatus));
  }

  // Payment Status filter
  if (filters.paymentStatus) {
    conditions.push(
      eq(salesTable.paymentStatus, filters.paymentStatus as PaymentStatus)
    );
  }

  return conditions;
};

// Add a new sale
export const addSale = async (sale: SaleFormValues) => {
  try {
    const productIds = sale.products.map((product) => product.productId);
    const existingProducts = await db
      .select({ id: productsTable.id, isActive: productsTable.isActive })
      .from(productsTable)
      .where(and(inArray(productsTable.id, productIds)));

    const inactiveProducts = existingProducts.filter(
      (p) => p.isActive === false
    );

    const existingProductIds = new Set(existingProducts.map((p) => p.id));
    const missingProducts = sale.products.filter(
      (p) => !existingProductIds.has(p.productId)
    );

    if (missingProducts.length > 0) {
      throw new Error(
        `Some products do not exist in the database: ${missingProducts
          .map((p) => p.productID || p.productId)
          .join(", ")}`
      );
    }

    const existingInvoiceNumber = await db
      .select({ invoiceNumber: salesTable.invoiceNumber })
      .from(salesTable)
      .where(eq(salesTable.invoiceNumber, sale.invoiceNumber));

    if (existingInvoiceNumber.length > 0) {
      throw new Error("Invoice number already exists");
    }

    const result = await db.transaction(async (tx) => {
      // Create main sale record
      const [newSale] = await tx
        .insert(salesTable)
        .values({
          invoiceNumber: sale.invoiceNumber,
          saleDate: sale.saleDate,
          customerId: sale.customerId,
          storeId: sale.storeId,
          subTotal: sale.subTotal,
          totalAmount: sale.totalAmount,
          discountAmount: sale.discountAmount,
          totalTaxAmount: sale.totalTaxAmount,
          amountPaid: sale.amountPaid,
          status: sale.status as SaleStatus,
          paymentMethod: sale.paymentMethod as PaymentMethod,
          paymentStatus: sale.paymentStatus as PaymentStatus,
          notes: sale.notes,
          quotationId: sale.quotationId && sale.quotationId,
          attachments: sale.attachments,
          isDeliveryAddressAdded: sale.isDeliveryAddressAdded,
          deliveryAddress: sale.deliveryAddress
            ? {
                addressName: sale.deliveryAddress.addressName || "",
                address: sale.deliveryAddress.address || "",
                city: sale.deliveryAddress.city || "",
                state: sale.deliveryAddress.state || "",
                country: sale.deliveryAddress.country || "",
                email: sale.deliveryAddress.email || "",
                phone: sale.deliveryAddress.phone || "",
              }
            : null,
        })
        .returning();

      // BATCH INSERT: Create all sale items at once
      const saleItemsData = sale.products.map((product) => ({
        saleId: newSale.id,
        storeId: newSale.storeId,
        productId: product.productId,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        totalPrice: product.totalPrice,
        subTotal: product.subTotal,
        taxAmount: product.taxAmount,
        discountAmount: product.discountAmount,
        discountRate: product.discountRate,
        taxRate: product.taxRate,
        taxRateId: product.taxRateId,
        productName: product.productName,
        productID: product.productID,
      }));

      const saleItems = await tx
        .insert(saleItemsTable)
        .values(saleItemsData)
        .returning();

      type SaleItemBackorderUpdate = {
        id: string;
        hasBackorder: boolean;
        backorderQuantity: number;
      };
      type Backorder = Omit<
        SaleBackorder,
        "id" | "isActive" | "createdAt" | "updatedAt"
      >;
      type SaleItemInventoryRecord = SaleInventoryStock & {
        saleItemId: string;
      };

      // BATCH INSERT: Create all inventory records
      const inventoryRecords: SaleItemInventoryRecord[] = [];
      sale.products.forEach((product, productIndex) => {
        product.inventoryStock.forEach((inventory) => {
          inventoryRecords.push({
            saleItemId: saleItems[productIndex].id,
            inventoryStockId: inventory.inventoryStockId,
            lotNumber: inventory.lotNumber,
            quantityToTake: inventory.quantityToTake,
          });
        });
      });

      if (inventoryRecords.length > 0) {
        await tx.insert(saleItemInventoryTable).values(inventoryRecords);
      }

      // BATCH INSERT: Create all backorders
      const backorderRecords: Backorder[] = [];

      const saleItemBackorderUpdates: SaleItemBackorderUpdate[] = [];

      sale.products.forEach((product, productIndex) => {
        if (product.hasBackorder && (product.backorderQuantity ?? 0) > 0) {
          backorderRecords.push({
            productId: product.productId,
            storeId: sale.storeId,
            saleItemId: saleItems[productIndex].id,
            pendingQuantity: product.backorderQuantity ?? 0,
          });

          saleItemBackorderUpdates.push({
            id: saleItems[productIndex].id,
            hasBackorder: true,
            backorderQuantity: product.backorderQuantity ?? 0,
          });
        }
      });

      if (backorderRecords.length > 0) {
        await tx.insert(backordersTable).values(backorderRecords);

        // Batch update sale items with backorder info
        for (const update of saleItemBackorderUpdates) {
          await tx
            .update(saleItemsTable)
            .set({
              hasBackorder: update.hasBackorder,
              backorderQuantity: update.backorderQuantity,
            })
            .where(eq(saleItemsTable.id, update.id));
        }
      }

      // Handle quotation and inactive products
      if (sale.quotationId) {
        await tx
          .update(quotationsTable)
          .set({
            convertedToSale: true,
            status: QuotationStatus.Completed,
          })
          .where(eq(quotationsTable.id, sale.quotationId));
      }

      if (inactiveProducts.length > 0) {
        await tx
          .update(productsTable)
          .set({ isActive: true })
          .where(
            inArray(
              productsTable.id,
              inactiveProducts.map((p) => p.id)
            )
          );
      }

      return { sale: newSale, items: saleItems };
    });

    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error creating sale:", error);
    throw error;
  }
};

// Edit Sale
export const editSale = async (sale: SaleFormValues, saleId: string) => {
  try {
    // Verify that all products exist in the database before proceeding
    const productIds = sale.products.map((product) => product.productId);
    const existingProducts = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        and(
          inArray(productsTable.id, productIds),
          eq(productsTable.isActive, true)
        )
      );

    const existingProductIds = new Set(existingProducts.map((p) => p.id));
    const missingProducts = sale.products.filter(
      (p) => !existingProductIds.has(p.productId)
    );

    if (missingProducts.length > 0) {
      throw new Error(
        `Some products do not exist in the database: ${missingProducts
          .map((p) => p.productID || p.productId)
          .join(", ")}`
      );
    }

    const result = await db.transaction(async (tx) => {
      try {
        // Update main sale record
        const [updatedSale] = await tx
          .update(salesTable)
          .set({
            invoiceNumber: sale.invoiceNumber,
            saleDate: sale.saleDate,
            customerId: sale.customerId,
            storeId: sale.storeId,
            subTotal: sale.subTotal,
            totalAmount: sale.totalAmount,
            discountAmount: sale.discountAmount,
            totalTaxAmount: sale.totalTaxAmount,
            amountPaid: sale.amountPaid,
            status: sale.status as SaleStatus,
            paymentMethod: sale.paymentMethod as PaymentMethod,
            paymentStatus: sale.paymentStatus as PaymentStatus,
            notes: sale.notes,
            quotationId: sale.quotationId && sale.quotationId,
            attachments: sale.attachments,
            isDeliveryAddressAdded: sale.isDeliveryAddressAdded,
            deliveryAddress: sale.deliveryAddress
              ? {
                  addressName: sale.deliveryAddress.addressName || "",
                  address: sale.deliveryAddress.address || "",
                  city: sale.deliveryAddress.city || "",
                  state: sale.deliveryAddress.state || "",
                  country: sale.deliveryAddress.country || "",
                  email: sale.deliveryAddress.email || "",
                  phone: sale.deliveryAddress.phone || "",
                }
              : null,
          })
          .where(eq(salesTable.id, saleId))
          .returning();

        // BATCH FETCH: Get ALL related data for the existing sale in parallel
        const [
          existingSaleItems,
          existingSaleItemInventory,
          existingBackorders,
        ]: [
          (typeof saleItemsTable.$inferSelect)[],
          {
            id: string;
            saleItemId: string;
            inventoryStockId: string;
            lotNumber: string;
            quantityToTake: number;
            productId: string;
          }[],
          (typeof backordersTable.$inferSelect)[]
        ] = await Promise.all([
          tx
            .select()
            .from(saleItemsTable)
            .where(
              and(
                eq(saleItemsTable.saleId, saleId),
                eq(saleItemsTable.isActive, true)
              )
            ),
          tx
            .select({
              id: saleItemInventoryTable.id,
              saleItemId: saleItemInventoryTable.saleItemId,
              inventoryStockId: saleItemInventoryTable.inventoryStockId,
              lotNumber: saleItemInventoryTable.lotNumber,
              quantityToTake: saleItemInventoryTable.quantityToTake,
              productId: saleItemsTable.productId,
            })
            .from(saleItemInventoryTable)
            .innerJoin(
              saleItemsTable,
              eq(saleItemInventoryTable.saleItemId, saleItemsTable.id)
            )
            .where(
              and(
                eq(saleItemsTable.saleId, saleId),
                eq(saleItemInventoryTable.isActive, true),
                eq(saleItemsTable.isActive, true)
              )
            ),
          // Use a closure to avoid referencing existingSaleItems in its own initializer
          (async () => {
            const items = await tx
              .select()
              .from(saleItemsTable)
              .where(
                and(
                  eq(saleItemsTable.saleId, saleId),
                  eq(saleItemsTable.isActive, true)
                )
              );
            const saleItemIds = items.map((item) => item.id);
            if (saleItemIds.length === 0) return [];
            return tx
              .select()
              .from(backordersTable)
              .where(
                and(
                  inArray(backordersTable.saleItemId, saleItemIds),
                  eq(backordersTable.isActive, true)
                )
              );
          })(),
        ]);

        // Create lookup maps for existing data
        const existingSaleItemsMap = new Map(
          existingSaleItems.map((item) => [item.productId, item])
        );
        const existingSaleItemInventoryMap = new Map<
          string,
          SaleInventoryStock[]
        >();
        existingSaleItemInventory.forEach((inv) => {
          if (!existingSaleItemInventoryMap.has(inv.saleItemId)) {
            existingSaleItemInventoryMap.set(inv.saleItemId, []);
          }
          existingSaleItemInventoryMap.get(inv.saleItemId)?.push(inv);
        });
        const existingBackordersMap = new Map<
          string,
          (typeof backordersTable.$inferSelect)[]
        >();
        existingBackorders.forEach((backorder) => {
          if (!existingBackordersMap.has(backorder.saleItemId)) {
            existingBackordersMap.set(backorder.saleItemId, []);
          }
          existingBackordersMap.get(backorder.saleItemId)?.push(backorder);
        });

        // Determine items to Create, Update, and Deactivate
        const saleItemsToCreate = [];
        const saleItemsToUpdate = [];
        const currentSaleItemIds = new Set<string>();
        const productAllocationAdjustments = new Map<string, number>();

        // Process new sale products to identify creates/updates
        for (const product of sale.products) {
          const existingSaleItem = existingSaleItemsMap.get(product.productId);

          // Calculate previous allocation for this product (if it existed)
          let previousAllocatedQuantity = 0;
          if (existingSaleItem) {
            currentSaleItemIds.add(existingSaleItem.id);
            const inventoryRecords =
              existingSaleItemInventoryMap.get(existingSaleItem.id) || [];
            previousAllocatedQuantity =
              inventoryRecords.reduce(
                (total, inv) => total + inv.quantityToTake,
                0
              ) + (existingSaleItem.backorderQuantity || 0);
          }

          // Calculate new allocation for this product
          const newAllocatedQuantity =
            product.inventoryStock.reduce(
              (total, inv) => total + inv.quantityToTake,
              0
            ) + (product.backorderQuantity || 0);

          // Determine the net change for product quantity
          const netQuantityChange =
            previousAllocatedQuantity - newAllocatedQuantity;

          if (productAllocationAdjustments.has(product.productId)) {
            productAllocationAdjustments.set(
              product.productId,
              productAllocationAdjustments.get(product.productId)! +
                netQuantityChange
            );
          } else {
            productAllocationAdjustments.set(
              product.productId,
              netQuantityChange
            );
          }

          if (existingSaleItem) {
            saleItemsToUpdate.push({
              ...existingSaleItem,
              quantity: product.quantity,
              unitPrice: product.unitPrice,
              totalPrice: product.totalPrice,
              subTotal: product.subTotal,
              taxAmount: product.taxAmount,
              discountAmount: product.discountAmount,
              discountRate: product.discountRate,
              taxRate: product.taxRate,
              taxRateId: product.taxRateId,
              productName: product.productName,
              productID: product.productID,
              hasBackorder: product.hasBackorder || false,
              backorderQuantity: product.backorderQuantity || 0,
            });
          } else {
            // Create new sale item
            saleItemsToCreate.push({
              saleId: updatedSale.id,
              storeId: updatedSale.storeId,
              productId: product.productId,
              quantity: product.quantity,
              unitPrice: product.unitPrice,
              totalPrice: product.totalPrice,
              subTotal: product.subTotal,
              taxAmount: product.taxAmount,
              discountAmount: product.discountAmount,
              discountRate: product.discountRate,
              taxRate: product.taxRate,
              taxRateId: product.taxRateId,
              productName: product.productName,
              productID: product.productID,
              hasBackorder: product.hasBackorder || false,
              backorderQuantity: product.backorderQuantity || 0,
            });
          }
        }

        // Identify existing sale items that are no longer in the updated sale (to deactivate)
        const saleItemsToDeactivate = existingSaleItems.filter(
          (item) => !currentSaleItemIds.has(item.id)
        );

        // For deactivated items, add their allocations to the product restore map
        saleItemsToDeactivate.forEach((item) => {
          const inventoryRecords =
            existingSaleItemInventoryMap.get(item.id) || [];
          const restoredQuantity =
            inventoryRecords.reduce(
              (total, inv) => total + inv.quantityToTake,
              0
            ) + (item.backorderQuantity || 0);

          if (restoredQuantity > 0) {
            const current =
              productAllocationAdjustments.get(item.productId) || 0;
            productAllocationAdjustments.set(
              item.productId,
              current + restoredQuantity
            );
          }
        });

        // BATCH DEACTIVATE/DELETE related records
        const saleItemIdsToDeactivate = saleItemsToDeactivate.map(
          (item) => item.id
        );
        const saleItemIdsToUpdate = saleItemsToUpdate.map((item) => item.id);
        const allRelevantSaleItemIds = [
          ...saleItemIdsToDeactivate,
          ...saleItemIdsToUpdate,
        ];

        // delete related inventory and backorder records for items that are either removed or updated.
        const deletePromises = [];
        if (allRelevantSaleItemIds.length > 0) {
          deletePromises.push(
            tx
              .delete(saleItemInventoryTable)
              .where(
                inArray(
                  saleItemInventoryTable.saleItemId,
                  allRelevantSaleItemIds
                )
              )
          );
          deletePromises.push(
            tx
              .delete(backordersTable)
              .where(
                inArray(backordersTable.saleItemId, allRelevantSaleItemIds)
              )
          );
        }
        if (saleItemIdsToDeactivate.length > 0) {
          deletePromises.push(
            tx
              .delete(saleItemsTable)
              .where(inArray(saleItemsTable.id, saleItemIdsToDeactivate))
          );
        }

        await Promise.all(deletePromises);

        //BATCH INSERT new sale items and get their IDs
        let createdSaleItems: (typeof saleItemsTable.$inferSelect)[] = [];
        if (saleItemsToCreate.length > 0) {
          createdSaleItems = await tx
            .insert(saleItemsTable)
            .values(saleItemsToCreate)
            .returning();
        }

        // BATCH UPDATE existing sale items
        if (saleItemsToUpdate.length > 0) {
          const updateSaleItemPromises = saleItemsToUpdate.map((item) =>
            tx
              .update(saleItemsTable)
              .set({
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                subTotal: item.subTotal,
                taxAmount: item.taxAmount,
                discountAmount: item.discountAmount,
                discountRate: item.discountRate,
                taxRate: item.taxRate,
                taxRateId: item.taxRateId,
                productName: item.productName,
                productID: item.productID,
                hasBackorder: item.hasBackorder,
                backorderQuantity: item.backorderQuantity,
              })
              .where(eq(saleItemsTable.id, item.id))
          );
          await Promise.all(updateSaleItemPromises);
        }

        // Combine updated existing items and newly created items for further processing
        const allCurrentSaleItems = [...saleItemsToUpdate, ...createdSaleItems];

        // BATCH INSERT: Create all new inventory and backorder records
        const inventoryRecordsToInsert: (typeof saleItemInventoryTable.$inferInsert)[] =
          [];
        const backorderRecordsToInsert: (typeof backordersTable.$inferInsert)[] =
          [];

        sale.products.forEach((product) => {
          const correspondingSaleItem = allCurrentSaleItems.find(
            (item) => item.productId === product.productId
          );

          if (!correspondingSaleItem) {
            console.warn(
              `Could not find corresponding sale item for product ${product.productId}`
            );
            return;
          }

          // Collect inventory records
          product.inventoryStock.forEach((inventory) => {
            inventoryRecordsToInsert.push({
              saleItemId: correspondingSaleItem.id,
              inventoryStockId: inventory.inventoryStockId,
              lotNumber: inventory.lotNumber,
              quantityToTake: inventory.quantityToTake,
            });
          });

          // Collect backorder records
          if (product.hasBackorder && (product.backorderQuantity ?? 0) > 0) {
            backorderRecordsToInsert.push({
              productId: product.productId,
              storeId: sale.storeId,
              saleItemId: correspondingSaleItem.id,
              pendingQuantity: product.backorderQuantity ?? 0,
            });
          }
        });

        // Execute batch inserts in parallel
        const insertPromises = [];
        if (inventoryRecordsToInsert.length > 0) {
          insertPromises.push(
            tx.insert(saleItemInventoryTable).values(inventoryRecordsToInsert)
          );
        }
        if (backorderRecordsToInsert.length > 0) {
          insertPromises.push(
            tx.insert(backordersTable).values(backorderRecordsToInsert)
          );
        }

        if (insertPromises.length > 0) {
          await Promise.all(insertPromises);
        }

        // Mark quotation as converted to sale if creating from quotation
        if (sale.quotationId) {
          await tx
            .update(quotationsTable)
            .set({
              convertedToSale: true,
              status: QuotationStatus.Completed,
            })
            .where(eq(quotationsTable.id, sale.quotationId));
        }

        return {
          sale: updatedSale,
          items: allCurrentSaleItems,
        };
      } catch (error) {
        console.error("Transaction error:", error);
        throw error;
      }
    });

    revalidatePath("/sales");
    revalidatePath(`/sales/edit-sale/${saleId}`);
    return parseStringify(result);
  } catch (error) {
    console.error("Error updating sale:", error);
    throw error;
  }
};

// Get Sale by ID
export const getSaleById = async (saleId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main sale record
      const sale = await tx
        .select({
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
          delivery: deliveriesTable,
          promissoryNote: promissoryNotesTable,
        })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        .leftJoin(storesTable, eq(salesTable.storeId, storesTable.id))
        .leftJoin(deliveriesTable, eq(salesTable.id, deliveriesTable.saleId))
        .leftJoin(
          promissoryNotesTable,
          eq(salesTable.id, promissoryNotesTable.saleId)
        )
        .where(and(eq(salesTable.id, saleId), eq(salesTable.isActive, true)))
        .then((res) => res[0]);

      if (!sale) {
        return null;
      }

      // Get all items for this sale
      const items = await tx
        .select()
        .from(saleItemsTable)
        .where(
          and(
            eq(saleItemsTable.saleId, saleId),
            eq(saleItemsTable.isActive, true)
          )
        );

      // Get all inventory records for these sale items
      const saleItemIds = items.map((item) => item.id);
      const inventoryRecords =
        saleItemIds.length > 0
          ? await tx
              .select({
                saleItemInventory: saleItemInventoryTable,
                inventory: inventoryTable,
              })
              .from(saleItemInventoryTable)
              .leftJoin(
                inventoryTable,
                eq(saleItemInventoryTable.inventoryStockId, inventoryTable.id)
              )
              .where(
                and(
                  inArray(saleItemInventoryTable.saleItemId, saleItemIds),
                  eq(saleItemInventoryTable.isActive, true)
                )
              )
          : [];

      // Get all backorder records for these sale items
      const backorderRecords =
        saleItemIds.length > 0
          ? await tx
              .select()
              .from(backordersTable)
              .where(
                and(
                  inArray(backordersTable.saleItemId, saleItemIds),
                  eq(backordersTable.isActive, true)
                )
              )
          : [];

      // Create a map of sale item ID to its inventory records
      const inventoryMap = new Map();
      inventoryRecords.forEach((record) => {
        const saleItemId = record.saleItemInventory.saleItemId;
        if (!inventoryMap.has(saleItemId)) {
          inventoryMap.set(saleItemId, []);
        }
        inventoryMap.get(saleItemId).push({
          inventoryStockId: record.saleItemInventory.inventoryStockId,
          lotNumber: record.saleItemInventory.lotNumber,
          quantityToTake: record.saleItemInventory.quantityToTake,
          inventory: record.inventory,
        });
      });

      // Create a map of sale item ID to its backorder records
      const backorderMap = new Map();
      backorderRecords.forEach((record) => {
        const saleItemId = record.saleItemId;
        if (!backorderMap.has(saleItemId)) {
          backorderMap.set(saleItemId, []);
        }
        backorderMap.get(saleItemId).push({
          id: record.id,
          productId: record.productId,
          storeId: record.storeId,
          saleItemId: record.saleItemId,
          pendingQuantity: record.pendingQuantity,
        });
      });

      const saleWithItems = {
        ...sale,
        products: items.map((item) => ({
          id: item.id,
          inventoryStock: inventoryMap.get(item.id) || [],
          backorders: backorderMap.get(item.id) || [],
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          subTotal: item.subTotal,
          taxAmount: item.taxAmount,
          discountAmount: item.discountAmount,
          discountRate: item.discountRate,
          taxRate: item.taxRate,
          taxRateId: item.taxRateId,
          productName: item.productName,
          productID: item.productID,
          storeId: item.storeId,
          saleId: item.saleId,
          hasBackorder: item.hasBackorder,
          backOrderQuantity: item.backorderQuantity,
          fulfilledQuantity: item.fulfilledQuantity,
        })),
      };

      return saleWithItems;
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting sale:", error);
    throw error;
  }
};

// Get all sales with pagination - Updated with backorder support
export const getSales = async (
  page: number = 0,
  limit: number = 10,
  getAllSales: boolean = false,
  filters?: SaleFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main sales (all or paginated)
      let salesQuery = tx
        .select({
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
          delivery: deliveriesTable,
          promissoryNote: promissoryNotesTable,
        })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        .leftJoin(storesTable, eq(salesTable.storeId, storesTable.id))
        .leftJoin(deliveriesTable, eq(salesTable.id, deliveriesTable.saleId))
        .leftJoin(
          promissoryNotesTable,
          eq(salesTable.id, promissoryNotesTable.saleId)
        )
        .$dynamic();

      const conditions = await buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        salesQuery = salesQuery.where(and(...conditions));
      }

      salesQuery = salesQuery.orderBy(desc(salesTable.createdAt));

      if (!getAllSales && limit > 0) {
        salesQuery = salesQuery.limit(limit).offset(page * limit);
      }
      const sales = await salesQuery;

      // Get all items for these sales in a single query
      const saleIds = sales.map((s) => s.sale.id);
      const items =
        saleIds.length > 0
          ? await tx
              .select()
              .from(saleItemsTable)
              .where(
                and(
                  inArray(saleItemsTable.saleId, saleIds),
                  eq(saleItemsTable.isActive, true)
                )
              )
          : [];

      // Get all inventory records for these sale items
      const saleItemIds = items.map((item) => item.id);
      const inventoryRecords =
        saleItemIds.length > 0
          ? await tx
              .select({
                saleItemInventory: saleItemInventoryTable,
                inventory: inventoryTable,
              })
              .from(saleItemInventoryTable)
              .leftJoin(
                inventoryTable,
                eq(saleItemInventoryTable.inventoryStockId, inventoryTable.id)
              )
              .where(
                and(
                  inArray(saleItemInventoryTable.saleItemId, saleItemIds),
                  eq(saleItemInventoryTable.isActive, true)
                )
              )
          : [];

      // Get all backorder records for these sale items
      const backorderRecords =
        saleItemIds.length > 0
          ? await tx
              .select()
              .from(backordersTable)
              .where(
                and(
                  inArray(backordersTable.saleItemId, saleItemIds),
                  eq(backordersTable.isActive, true)
                )
              )
          : [];

      // Create a map of sale item ID to its inventory records
      const inventoryMap = new Map();
      inventoryRecords.forEach((record) => {
        const saleItemId = record.saleItemInventory.saleItemId;
        if (!inventoryMap.has(saleItemId)) {
          inventoryMap.set(saleItemId, []);
        }
        inventoryMap.get(saleItemId).push({
          inventoryStockId: record.saleItemInventory.inventoryStockId,
          lotNumber: record.saleItemInventory.lotNumber,
          quantityToTake: record.saleItemInventory.quantityToTake,
          inventory: record.inventory,
        });
      });

      // Create a map of sale item ID to its backorder records
      const backorderMap = new Map();
      backorderRecords.forEach((record) => {
        const saleItemId = record.saleItemId;
        if (!backorderMap.has(saleItemId)) {
          backorderMap.set(saleItemId, []);
        }
        backorderMap.get(saleItemId).push({
          id: record.id,
          productId: record.productId,
          storeId: record.storeId,
          saleItemId: record.saleItemId,
          pendingQuantity: record.pendingQuantity,
        });
      });

      // Combine the data
      const salesWithItems = sales.map((sale) => ({
        ...sale,
        products: items
          .filter((item) => item.saleId === sale.sale.id)
          .map((item) => ({
            id: item.id,
            inventoryStock: inventoryMap.get(item.id) || [],
            backorders: backorderMap.get(item.id) || [],
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            subTotal: item.subTotal,
            taxAmount: item.taxAmount,
            discountAmount: item.discountAmount,
            discountRate: item.discountRate,
            taxRate: item.taxRate,
            taxRateId: item.taxRateId,
            productName: item.productName,
            productID: item.productID,
            storeId: item.storeId,
            saleId: item.saleId,
            hasBackorder: item.hasBackorder,
            backOrderQuantity: item.backorderQuantity,
            fulfilledQuantity: item.fulfilledQuantity,
          })),
      }));

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        .leftJoin(storesTable, eq(salesTable.storeId, storesTable.id))
        .leftJoin(deliveriesTable, eq(salesTable.id, deliveriesTable.saleId))
        .leftJoin(
          promissoryNotesTable,
          eq(salesTable.id, promissoryNotesTable.saleId)
        )
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllSales
        ? sales.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: salesWithItems,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting sales:", error);
    throw error;
  }
};

// Generate invoice number
export const generateInvoiceNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastSale = await tx
        .select({ invoiceNumber: salesTable.invoiceNumber })
        .from(salesTable)
        .where(sql`invoice_number LIKE ${`INV.${year}/${month}/%`}`)
        .orderBy(desc(salesTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastSale.length > 0) {
        const lastInvoiceNumber = lastSale[0].invoiceNumber;
        const lastSequence = parseInt(
          lastInvoiceNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `INV.${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating invoice number:", error);
    throw error;
  }
};

// Permanently delete Sale with transaction
export const deleteSale = async (saleId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const saleItems = await tx
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, saleId));

      const saleItemIds = saleItems.map((item) => item.id);

      // Get inventory records to calculate quantities to restore
      const inventoryRecords =
        saleItemIds.length > 0
          ? await tx
              .select()
              .from(saleItemInventoryTable)
              .where(inArray(saleItemInventoryTable.saleItemId, saleItemIds))
          : [];

      // Calculate quantities to restore per product
      const productQuantityMap = new Map();

      // Add quantities from inventory allocations
      inventoryRecords.forEach((record) => {
        const saleItem = saleItems.find(
          (item) => item.id === record.saleItemId
        );
        if (saleItem) {
          const current = productQuantityMap.get(saleItem.productId) || 0;
          productQuantityMap.set(
            saleItem.productId,
            current + record.quantityToTake
          );
        }
      });

      // Add backorder quantities
      saleItems.forEach((item) => {
        if (item.hasBackorder && item.backorderQuantity > 0) {
          const current = productQuantityMap.get(item.productId) || 0;
          productQuantityMap.set(
            item.productId,
            current + item.backorderQuantity
          );
        }
      });

      for (const product of saleItems) {
        if (product.hasBackorder && product.backorderQuantity > 0) {
          await tx
            .delete(backordersTable)
            .where(
              and(
                eq(backordersTable.productId, product.productId),
                eq(backordersTable.saleItemId, product.id),
                eq(backordersTable.storeId, product.storeId)
              )
            );
        }

        await tx
          .delete(saleItemInventoryTable)
          .where(eq(saleItemInventoryTable.saleItemId, product.id));
      }
      // Delete sale items
      await tx.delete(saleItemsTable).where(eq(saleItemsTable.saleId, saleId));

      // Delete the main sale record
      const [deletedSale] = await tx
        .delete(salesTable)
        .where(eq(salesTable.id, saleId))
        .returning();

      return deletedSale;
    });

    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting sale:", error);
    throw error;
  }
};

// Soft delete sale with transaction
export const softDeleteSale = async (saleId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get sale items to calculate restoration quantities
      const saleItems = await tx
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, saleId));

      const saleItemIds = saleItems.map((item) => item.id);

      // Get inventory records
      const inventoryRecords =
        saleItemIds.length > 0
          ? await tx
              .select()
              .from(saleItemInventoryTable)
              .where(inArray(saleItemInventoryTable.saleItemId, saleItemIds))
          : [];

      // Calculate and restore product quantities (same logic as deleteSale)
      const productQuantityMap = new Map();

      inventoryRecords.forEach((record) => {
        const saleItem = saleItems.find(
          (item) => item.id === record.saleItemId
        );
        if (saleItem) {
          const current = productQuantityMap.get(saleItem.productId) || 0;
          productQuantityMap.set(
            saleItem.productId,
            current + record.quantityToTake
          );
        }
      });

      saleItems.forEach((item) => {
        if (item.hasBackorder && item.backorderQuantity > 0) {
          const current = productQuantityMap.get(item.productId) || 0;
          productQuantityMap.set(
            item.productId,
            current + item.backorderQuantity
          );
        }
      });

      const [updatedSaleItem] = await tx
        .update(saleItemsTable)
        .set({ isActive: false })
        .where(eq(saleItemsTable.saleId, saleId))
        .returning();

      await tx
        .update(saleItemInventoryTable)
        .set({ isActive: false })
        .where(inArray(saleItemInventoryTable.saleItemId, saleItemIds));

      if (
        updatedSaleItem.hasBackorder &&
        updatedSaleItem.backorderQuantity > 0
      ) {
        await tx
          .update(backordersTable)
          .set({ isActive: false })
          .where(eq(backordersTable.saleItemId, updatedSaleItem.id));
      }

      const [updatedSale] = await tx
        .update(salesTable)
        .set({ isActive: false })
        .where(eq(salesTable.id, saleId))
        .returning();

      return updatedSale;
    });
    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting sale:", error);
    throw error;
  }
};
