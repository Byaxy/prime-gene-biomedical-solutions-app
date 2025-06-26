/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";

import { SaleFormValues } from "../validation";
import {
  backordersTable,
  customersTable,
  inventoryTable,
  productsTable,
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
  SaleInventoryStock,
  SaleStatus,
} from "@/types";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { SaleFilters } from "@/hooks/useSales";

// Add a new sale
export const addSale = async (sale: SaleFormValues) => {
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
          .map((p) => p.productID || p.productName)
          .join(", ")}`
      );
    }
    const result = await db.transaction(async (tx) => {
      try {
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
            quotationId: sale.quotationId,
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

        // Process each product in the sale
        const saleItems = [];
        for (const product of sale.products) {
          // Create sale item
          const [saleItem] = await tx
            .insert(saleItemsTable)
            .values({
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
            })
            .returning();

          // Calculate total quantity being allocated (sold + backordered)
          const allocatedQuantity =
            product.inventoryStock.reduce(
              (total, inv) => total + inv.quantityToTake,
              0
            ) + (product.backorderQuantity || 0);

          // Update main product quantity to reflect allocated stock
          if (allocatedQuantity > 0) {
            await tx
              .update(productsTable)
              .set({
                quantity: sql`${productsTable.quantity} - ${allocatedQuantity}`,
              })
              .where(eq(productsTable.id, product.productId));
          }

          // Handle sale item inventory stock
          for (const inventory of product.inventoryStock) {
            // create sale item invetory
            await tx.insert(saleItemInventoryTable).values({
              saleItemId: saleItem.id,
              inventoryStockId: inventory.inventoryStockId,
              lotNumber: inventory.lotNumber,
              quantityToTake: inventory.quantityToTake,
            });
          }

          // Handle backorder
          if (product.hasBackorder && (product.backorderQuantity ?? 0) > 0) {
            await tx.insert(backordersTable).values({
              productId: product.productId,
              storeId: sale.storeId,
              saleItemId: saleItem.id,
              pendingQuantity: product.backorderQuantity ?? 0,
            });

            // Store backorder reference in sale item
            await tx
              .update(saleItemsTable)
              .set({
                hasBackorder: true,
                backorderQuantity: product.backorderQuantity,
              })
              .where(eq(saleItemsTable.id, saleItem.id));
          }
          saleItems.push(saleItem);
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

        return { sale: newSale, items: saleItems };
      } catch (error) {
        console.error("Transaction error:", error);
        throw error;
      }
    });

    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error creating sale:", error);
    throw error;
  }
};

// Edit sale
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
            quotationId: sale.quotationId,
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

        // Get existing sale items with their inventory relationships and backorders
        const existingSaleItems = await tx
          .select({
            id: saleItemsTable.id,
            productId: saleItemsTable.productId,
            quantity: saleItemsTable.quantity,
            unitPrice: saleItemsTable.unitPrice,
            totalPrice: saleItemsTable.totalPrice,
            subTotal: saleItemsTable.subTotal,
            taxAmount: saleItemsTable.taxAmount,
            discountAmount: saleItemsTable.discountAmount,
            discountRate: saleItemsTable.discountRate,
            taxRate: saleItemsTable.taxRate,
            taxRateId: saleItemsTable.taxRateId,
            productName: saleItemsTable.productName,
            productID: saleItemsTable.productID,
            hasBackorder: saleItemsTable.hasBackorder,
            backOrderQuantity: saleItemsTable.backorderQuantity,
          })
          .from(saleItemsTable)
          .where(
            and(
              eq(saleItemsTable.saleId, saleId),
              eq(saleItemsTable.isActive, true)
            )
          );

        // Get existing sale item inventory relationships
        const existingSaleItemInventory = await tx
          .select()
          .from(saleItemInventoryTable)
          .where(
            and(
              inArray(
                saleItemInventoryTable.saleItemId,
                existingSaleItems.map((item) => item.id)
              ),
              eq(saleItemInventoryTable.isActive, true)
            )
          );

        // Get existing backorders for these sale items
        const existingBackorders = await tx
          .select()
          .from(backordersTable)
          .where(
            and(
              inArray(
                backordersTable.saleItemId,
                existingSaleItems.map((item) => item.id)
              ),
              eq(backordersTable.isActive, true)
            )
          );

        // Create lookup maps for easier processing
        const saleItemInventoryMap = new Map();
        existingSaleItemInventory.forEach((inv) => {
          if (!saleItemInventoryMap.has(inv.saleItemId)) {
            saleItemInventoryMap.set(inv.saleItemId, []);
          }
          saleItemInventoryMap.get(inv.saleItemId).push(inv);
        });

        const saleItemBackordersMap = new Map();
        existingBackorders.forEach((backorder) => {
          if (!saleItemBackordersMap.has(backorder.saleItemId)) {
            saleItemBackordersMap.set(backorder.saleItemId, []);
          }
          saleItemBackordersMap.get(backorder.saleItemId).push(backorder);
        });

        // Process each product in the sale similar to addSale
        const saleItems = [];
        const processedSaleItemIds = new Set();

        for (const product of sale.products) {
          // Find if this product corresponds to an existing sale item
          const existingSaleItem = existingSaleItems.find(
            (item) => item.productId === product.productId
          );

          if (existingSaleItem) {
            // Clean up existing inventory and backorder relationships
            const existingInventoryRecords =
              saleItemInventoryMap.get(existingSaleItem.id) || [];
            const existingBackorderRecords =
              saleItemBackordersMap.get(existingSaleItem.id) || [];

            const previousAllocatedQuantity =
              existingInventoryRecords.reduce(
                (total: number, inv: SaleInventoryStock) =>
                  total + inv.quantityToTake,
                0
              ) + (existingSaleItem.backOrderQuantity || 0);

            // CALCULATE NEW ALLOCATED QUANTITY
            const newAllocatedQuantity =
              product.inventoryStock.reduce(
                (total, inv) => total + inv.quantityToTake,
                0
              ) + (product.backorderQuantity || 0);

            // RESTORE PREVIOUS ALLOCATION
            if (previousAllocatedQuantity > 0) {
              await tx
                .update(productsTable)
                .set({
                  quantity: sql`${productsTable.quantity} + ${previousAllocatedQuantity}`,
                })
                .where(eq(productsTable.id, product.productId));
            }

            // Update existing sale item
            const [updatedSaleItem] = await tx
              .update(saleItemsTable)
              .set({
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
                hasBackorder: false,
                backorderQuantity: 0,
              })
              .where(eq(saleItemsTable.id, existingSaleItem.id))
              .returning();

            // Reverse existing inventory transactions
            for (const invRecord of existingInventoryRecords) {
              // Delete sale item inventory record
              await tx
                .delete(saleItemInventoryTable)
                .where(eq(saleItemInventoryTable.id, invRecord.id));
            }

            // Clean up existing backorders
            for (const backorderRecord of existingBackorderRecords) {
              await tx
                .delete(backordersTable)
                .where(eq(backordersTable.id, backorderRecord.id));
            }

            // APPLY NEW ALLOCATION
            if (newAllocatedQuantity > 0) {
              await tx
                .update(productsTable)
                .set({
                  quantity: sql`${productsTable.quantity} - ${newAllocatedQuantity}`,
                })
                .where(eq(productsTable.id, product.productId));
            }

            // Now process the new inventory stock for this product (same as addSale)
            for (const inventory of product.inventoryStock) {
              // Handle existing inventory stock
              await tx.insert(saleItemInventoryTable).values({
                saleItemId: updatedSaleItem.id,
                inventoryStockId: inventory.inventoryStockId,
                lotNumber: inventory.lotNumber,
                quantityToTake: inventory.quantityToTake,
              });
            }

            // Handle back order
            if (product.hasBackorder && (product.backorderQuantity ?? 0) > 0) {
              // Create backorder
              await tx.insert(backordersTable).values({
                productId: product.productId,
                storeId: sale.storeId,
                saleItemId: updatedSaleItem.id,
                pendingQuantity: product.backorderQuantity ?? 0,
              });

              // Store backorder reference in sale item
              await tx
                .update(saleItemsTable)
                .set({
                  hasBackorder: true,
                  backorderQuantity: product.backorderQuantity,
                })
                .where(eq(saleItemsTable.id, updatedSaleItem.id));
            }

            saleItems.push(updatedSaleItem);
            processedSaleItemIds.add(existingSaleItem.id);
          } else {
            // Create new sale item (same logic as addSale)
            const [saleItem] = await tx
              .insert(saleItemsTable)
              .values({
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
              })
              .returning();

            // Calculate and apply allocation for new product
            const allocatedQuantity =
              product.inventoryStock.reduce(
                (total, inv) => total + inv.quantityToTake,
                0
              ) + (product.backorderQuantity || 0);

            if (allocatedQuantity > 0) {
              await tx
                .update(productsTable)
                .set({
                  quantity: sql`${productsTable.quantity} - ${allocatedQuantity}`,
                })
                .where(eq(productsTable.id, product.productId));
            }

            // Handle sale item inventory stock (same as addSale)
            for (const inventory of product.inventoryStock) {
              // Create sale item inventory
              await tx.insert(saleItemInventoryTable).values({
                saleItemId: saleItem.id,
                inventoryStockId: inventory.inventoryStockId,
                lotNumber: inventory.lotNumber,
                quantityToTake: inventory.quantityToTake,
              });
            }

            // Handle back order
            if (product.hasBackorder && (product.backorderQuantity ?? 0) > 0) {
              // Create backorder
              await tx.insert(backordersTable).values({
                productId: product.productId,
                storeId: sale.storeId,
                saleItemId: saleItem.id,
                pendingQuantity: product.backorderQuantity ?? 0,
              });

              // Store backorder reference in sale item
              await tx
                .update(saleItemsTable)
                .set({
                  hasBackorder: true,
                  backorderQuantity: product.backorderQuantity,
                })
                .where(eq(saleItemsTable.id, saleItem.id));
            }

            saleItems.push(saleItem);
          }
        }

        // Handle removal of sale items that are no longer in the updated sale
        const itemsToDelete = existingSaleItems.filter(
          (item) => !processedSaleItemIds.has(item.id)
        );

        for (const itemToDelete of itemsToDelete) {
          // Clean up inventory relationships
          const inventoryRecords =
            saleItemInventoryMap.get(itemToDelete.id) || [];
          const quantityToRestore =
            inventoryRecords.reduce(
              (total: number, inv: SaleInventoryStock) =>
                total + inv.quantityToTake,
              0
            ) + (itemToDelete.backOrderQuantity || 0);

          // Restore product quantity
          if (quantityToRestore > 0) {
            await tx
              .update(productsTable)
              .set({
                quantity: sql`${productsTable.quantity} + ${quantityToRestore}`,
              })
              .where(eq(productsTable.id, itemToDelete.productId));
          }

          for (const invRecord of inventoryRecords) {
            // Delete sale item inventory record
            await tx
              .delete(saleItemInventoryTable)
              .where(eq(saleItemInventoryTable.id, invRecord.id));
          }

          // Clean up backorders
          const backorderRecords =
            saleItemBackordersMap.get(itemToDelete.id) || [];
          for (const backorderRecord of backorderRecords) {
            await tx
              .delete(backordersTable)
              .where(eq(backordersTable.id, backorderRecord.id));
          }

          // Delete the sale item
          await tx
            .delete(saleItemsTable)
            .where(eq(saleItemsTable.id, itemToDelete.id));
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
          items: saleItems,
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
        })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        .leftJoin(storesTable, eq(salesTable.storeId, storesTable.id))
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
        })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        .leftJoin(storesTable, eq(salesTable.storeId, storesTable.id))
        .$dynamic();

      // Create conditions array
      const conditions = [eq(salesTable.isActive, true)];

      // Apply filters if provided
      if (filters) {
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
          conditions.push(
            gte(salesTable.saleDate, new Date(filters.saleDate_start))
          );
        }
        if (filters.saleDate_end) {
          conditions.push(
            lte(salesTable.saleDate, new Date(filters.saleDate_end))
          );
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
      }

      // Apply where conditions
      salesQuery = salesQuery.where(and(...conditions));

      // Apply order by
      salesQuery = salesQuery.orderBy(desc(salesTable.createdAt));

      if (!getAllSales) {
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
      const total = getAllSales
        ? sales.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(salesTable)
            .where(and(...conditions))
            .then((res) => res[0]?.count || 0);

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

      // Restore product quantities
      for (const [productId, quantityToRestore] of productQuantityMap) {
        await tx
          .update(productsTable)
          .set({
            quantity: sql`${productsTable.quantity} + ${quantityToRestore}`,
          })
          .where(eq(productsTable.id, productId));
      }

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

      // Restore product quantities
      for (const [productId, quantityToRestore] of productQuantityMap) {
        await tx
          .update(productsTable)
          .set({
            quantity: sql`${productsTable.quantity} + ${quantityToRestore}`,
          })
          .where(eq(productsTable.id, productId));
      }

      const [updatedSaleItem] = await tx
        .update(saleItemsTable)
        .set({ isActive: false })
        .where(eq(saleItemsTable.saleId, saleId))
        .returning();

      await tx
        .update(saleItemInventoryTable)
        .set({ isActive: false })
        .where(eq(saleItemInventoryTable.saleItemId, updatedSaleItem.id));

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
