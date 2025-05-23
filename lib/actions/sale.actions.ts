/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";

import { SaleFormValues } from "../validation";
import {
  customersTable,
  inventoryTable,
  inventoryTransactionsTable,
  productsTable,
  quotationsTable,
  saleItemsTable,
  salesTable,
  storesTable,
} from "@/drizzle/schema";
import {
  PaymentMethod,
  PaymentStatus,
  QuotationStatus,
  SaleStatus,
} from "@/types";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { SaleFilters } from "@/hooks/useSales";

// Add a new sale
export const addSale = async (sale: SaleFormValues, userId: string) => {
  try {
    // Verify that all products exist in the database before proceeding
    const productIds = sale.products.map((product) => product.productId);
    const existingProducts = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    const existingProductIds = new Set(existingProducts.map((p) => p.id));
    const missingProducts = sale.products.filter(
      (p) => !existingProductIds.has(p.productId)
    );

    if (missingProducts.length > 0) {
      throw new Error(
        `Some products do not exist in the database: ${missingProducts
          .map((p) => p.productName || p.productId)
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
          let newItem;

          if (!product.inventoryStockId) {
            const [newInventory] = await tx
              .insert(inventoryTable)
              .values({
                productId: product.productId,
                storeId: sale.storeId,
                lotNumber: `BackOrder-${Date.now()}`,
                quantity: 0,
                costPrice: 0,
                sellingPrice: product.unitPrice,
                manufactureDate: null,
                expiryDate: null,
                receivedDate: new Date(),
              })
              .returning();

            // Log initial inventory transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: newInventory.id,
              productId: product.productId,
              storeId: sale.storeId,
              userId: userId,
              transactionType: "sale",
              quantityBefore: 0,
              quantityAfter: 0,
              transactionDate: new Date(),
              notes: `Backorder stock created from sale`,
            });

            // Create sale item
            const [createdItem] = await tx
              .insert(saleItemsTable)
              .values({
                saleId: newSale.id,
                storeId: newSale.storeId,
                lotNumber: newInventory.lotNumber,
                inventoryStockId: newInventory.id,
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

            newItem = createdItem;

            // Update inventory to reflect negative quantity (backorder)
            await tx
              .update(inventoryTable)
              .set({
                quantity: -product.quantity,
              })
              .where(eq(inventoryTable.id, newInventory.id));

            // Log the inventory transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: newInventory.id,
              productId: product.productId,
              storeId: sale.storeId,
              userId: userId,
              transactionType: "sale",
              quantityBefore: 0,
              quantityAfter: -product.quantity,
              transactionDate: new Date(),
              notes: `Backorder quantity updated`,
            });

            // Update product total quantity
            await tx
              .update(productsTable)
              .set({
                quantity: sql`${productsTable.quantity} - ${product.quantity}`,
              })
              .where(eq(productsTable.id, product.productId));
          }
          // Handle existing inventory stock
          else {
            // Create sale item
            const [createdItem] = await tx
              .insert(saleItemsTable)
              .values({
                saleId: newSale.id,
                storeId: newSale.storeId,
                lotNumber: product.lotNumber,
                inventoryStockId: product.inventoryStockId,
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

            newItem = createdItem;

            // Update inventory quantity
            await tx
              .update(inventoryTable)
              .set({
                quantity: sql`${inventoryTable.quantity} - ${product.quantity}`,
              })
              .where(eq(inventoryTable.id, product.inventoryStockId));

            // Log the inventory transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: product.inventoryStockId,
              productId: product.productId,
              storeId: sale.storeId,
              userId: userId,
              transactionType: "sale",
              quantityBefore: product.availableQuantity ?? 0,
              quantityAfter:
                (product.availableQuantity ?? 0) - product.quantity,
              transactionDate: new Date(),
              notes: `Stock reduced for sale`,
            });

            // Update product total quantity
            await tx
              .update(productsTable)
              .set({
                quantity: sql`${productsTable.quantity} - ${product.quantity}`,
              })
              .where(eq(productsTable.id, product.productId));
          }

          saleItems.push(newItem);
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
export const editSale = async (
  sale: SaleFormValues,
  saleId: string,
  userId: string
) => {
  try {
    // Verify that all products exist in the database before proceeding
    const productIds = sale.products.map((product) => product.productId);
    const existingProducts = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    const existingProductIds = new Set(existingProducts.map((p) => p.id));
    const missingProducts = sale.products.filter(
      (p) => !existingProductIds.has(p.productId)
    );

    if (missingProducts.length > 0) {
      throw new Error(
        `Some products do not exist in the database: ${missingProducts
          .map((p) => p.productName || p.productId)
          .join(", ")}`
      );
    }

    const result = await db.transaction(async (tx) => {
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

      // Get existing sale items
      const existingSaleItems = await tx
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, saleId));

      // Create a more sophisticated matching system
      // We'll match items based on: productId + inventoryStockId combination
      // For items without stock (empty inventoryStockId), we'll match by order within the same product

      // Group new products by productId to handle multiple entries of same product
      const newProductsByProductId = new Map();
      sale.products.forEach((product, index) => {
        if (!newProductsByProductId.has(product.productId)) {
          newProductsByProductId.set(product.productId, []);
        }
        newProductsByProductId
          .get(product.productId)
          .push({ ...product, originalIndex: index });
      });

      // Group existing items by productId
      const existingItemsByProductId = new Map();
      existingSaleItems.forEach((item) => {
        if (!existingItemsByProductId.has(item.productId)) {
          existingItemsByProductId.set(item.productId, []);
        }
        existingItemsByProductId.get(item.productId).push(item);
      });

      // Track which existing items are matched and which new items are matched
      const matchedExistingItems = new Set();
      const matchedNewItems = new Set();
      const itemsToUpdate = [];
      const itemsToCreate: any = [];

      // Process each product group
      for (const [productId, newProductItems] of newProductsByProductId) {
        const existingItemsForProduct =
          existingItemsByProductId.get(productId) || [];

        // First pass: match items with specific inventoryStockId
        newProductItems.forEach((newItem: any) => {
          if (newItem.inventoryStockId && newItem.inventoryStockId !== "") {
            const matchingExistingItem = existingItemsForProduct.find(
              (existingItem: any) =>
                existingItem.inventoryStockId === newItem.inventoryStockId &&
                !matchedExistingItems.has(existingItem.id)
            );

            if (matchingExistingItem) {
              matchedExistingItems.add(matchingExistingItem.id);
              matchedNewItems.add(newItem.originalIndex);
              itemsToUpdate.push({
                existing: matchingExistingItem,
                new: newItem,
              });
            }
          }
        });

        // Second pass: match remaining items without specific inventory (empty inventoryStockId)
        // Match by order within the same product
        const remainingNewItems = newProductItems.filter(
          (item: any) => !matchedNewItems.has(item.originalIndex)
        );
        const remainingExistingItems = existingItemsForProduct.filter(
          (item: any) => !matchedExistingItems.has(item.id)
        );

        // Match remaining items by order
        const maxMatches = Math.min(
          remainingNewItems.length,
          remainingExistingItems.length
        );
        for (let i = 0; i < maxMatches; i++) {
          const newItem = remainingNewItems[i];
          const existingItem = remainingExistingItems[i];

          matchedExistingItems.add(existingItem.id);
          matchedNewItems.add(newItem.originalIndex);
          itemsToUpdate.push({
            existing: existingItem,
            new: newItem,
          });
        }

        // Any remaining new items should be created
        remainingNewItems.slice(maxMatches).forEach((newItem: any) => {
          itemsToCreate.push(newItem);
        });
      }

      // Any remaining existing items should be deleted
      const itemsToDelete = existingSaleItems.filter(
        (item) => !matchedExistingItems.has(item.id)
      );

      // Handle deletion and inventory reversal for removed items
      if (itemsToDelete.length > 0) {
        for (const item of itemsToDelete) {
          // Reverse inventory changes for deleted items
          if (item.inventoryStockId) {
            const [updatedInventory] = await tx
              .update(inventoryTable)
              .set({
                quantity: sql`${inventoryTable.quantity} + ${item.quantity}`,
              })
              .where(eq(inventoryTable.id, item.inventoryStockId))
              .returning();

            // Log the inventory reversal transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: item.inventoryStockId,
              productId: item.productId,
              storeId: updatedSale.storeId,
              userId: userId,
              transactionType: "sale_reversal",
              quantityBefore: updatedInventory.quantity - item.quantity,
              quantityAfter: updatedInventory.quantity,
              transactionDate: new Date(),
              notes: `Stock restored from sale edit - item removed`,
            });

            // Update product total quantity
            await tx
              .update(productsTable)
              .set({
                quantity: sql`${productsTable.quantity} + ${item.quantity}`,
              })
              .where(eq(productsTable.id, item.productId));
          }

          // Delete the sale item
          await tx.delete(saleItemsTable).where(eq(saleItemsTable.id, item.id));
        }
      }

      // Process updates
      const updatedItems = [];
      for (const { existing: existingItem, new: product } of itemsToUpdate) {
        // Handle quantity changes for existing items
        const quantityDifference = product.quantity - existingItem.quantity;

        if (quantityDifference !== 0 && existingItem.inventoryStockId) {
          // Update inventory quantity based on the difference
          const [updatedInventory] = await tx
            .update(inventoryTable)
            .set({
              quantity: sql`${inventoryTable.quantity} - ${quantityDifference}`,
            })
            .where(eq(inventoryTable.id, existingItem.inventoryStockId))
            .returning();

          // Log the inventory transaction
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: existingItem.inventoryStockId,
            productId: product.productId,
            storeId: updatedSale.storeId,
            userId: userId,
            transactionType: quantityDifference > 0 ? "sale" : "sale_reversal",
            quantityBefore: updatedInventory.quantity + quantityDifference,
            quantityAfter: updatedInventory.quantity,
            transactionDate: new Date(),
            notes: `Stock updated from sale edit - quantity changed`,
          });

          // Update product total quantity
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} - ${quantityDifference}`,
            })
            .where(eq(productsTable.id, product.productId));
        }

        // Update existing item
        const [updatedItem] = await tx
          .update(saleItemsTable)
          .set({
            lotNumber: product.lotNumber,
            inventoryStockId: product.inventoryStockId,
            quantity: product.quantity,
            unitPrice: product.unitPrice,
            totalPrice: product.totalPrice,
            subTotal: product.subTotal,
            taxAmount: product.taxAmount,
            discountAmount: product.discountAmount,
            discountRate: product.discountRate,
            taxRate: product.taxRate,
            taxRateId: product.taxRateId,
          })
          .where(eq(saleItemsTable.id, existingItem.id))
          .returning();

        updatedItems.push(updatedItem);
      }

      // Process new items
      const createdItems = [];
      for (const product of itemsToCreate) {
        let newItem;

        if (!product.inventoryStockId || product.inventoryStockId === "") {
          // Create backorder inventory for products without stock
          const [newInventory] = await tx
            .insert(inventoryTable)
            .values({
              productId: product.productId,
              storeId: updatedSale.storeId,
              lotNumber: `BackOrder-${Date.now()}`,
              quantity: 0,
              costPrice: 0,
              sellingPrice: product.unitPrice,
              manufactureDate: null,
              expiryDate: null,
              receivedDate: new Date(),
            })
            .returning();

          // Log initial inventory transaction
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: newInventory.id,
            productId: product.productId,
            storeId: updatedSale.storeId,
            userId: userId,
            transactionType: "sale",
            quantityBefore: 0,
            quantityAfter: 0,
            transactionDate: new Date(),
            notes: `Backorder stock created from sale edit`,
          });

          // Create sale item
          const [createdItem] = await tx
            .insert(saleItemsTable)
            .values({
              saleId: updatedSale.id,
              storeId: updatedSale.storeId,
              lotNumber: newInventory.lotNumber,
              inventoryStockId: newInventory.id,
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

          newItem = createdItem;

          // Update inventory to reflect negative quantity (backorder)
          await tx
            .update(inventoryTable)
            .set({
              quantity: -product.quantity,
            })
            .where(eq(inventoryTable.id, newInventory.id));

          // Log the inventory transaction
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: newInventory.id,
            productId: product.productId,
            storeId: updatedSale.storeId,
            userId: userId,
            transactionType: "sale",
            quantityBefore: 0,
            quantityAfter: -product.quantity,
            transactionDate: new Date(),
            notes: `Backorder quantity updated from sale edit`,
          });

          // Update product total quantity
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} - ${product.quantity}`,
            })
            .where(eq(productsTable.id, product.productId));
        } else {
          // Handle existing inventory stock
          const [createdItem] = await tx
            .insert(saleItemsTable)
            .values({
              saleId: updatedSale.id,
              storeId: updatedSale.storeId,
              lotNumber: product.lotNumber,
              inventoryStockId: product.inventoryStockId,
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

          newItem = createdItem;

          // Update inventory quantity
          const [updatedInventory] = await tx
            .update(inventoryTable)
            .set({
              quantity: sql`${inventoryTable.quantity} - ${product.quantity}`,
            })
            .where(eq(inventoryTable.id, product.inventoryStockId))
            .returning();

          // Log the inventory transaction
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: product.inventoryStockId,
            productId: product.productId,
            storeId: updatedSale.storeId,
            userId: userId,
            transactionType: "sale",
            quantityBefore: updatedInventory.quantity + product.quantity,
            quantityAfter: updatedInventory.quantity,
            transactionDate: new Date(),
            notes: `Stock reduced for sale edit - new item`,
          });

          // Update product total quantity
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} - ${product.quantity}`,
            })
            .where(eq(productsTable.id, product.productId));
        }

        createdItems.push(newItem);
      }

      return {
        sale: updatedSale,
        items: [...updatedItems, ...createdItems],
      };
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

      const saleWithItems = {
        ...sale,
        products: items.map((item) => ({
          id: item.id,
          lotNumber: item.lotNumber,
          inventoryStockId: item.inventoryStockId,
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

// Get all sales with pagination
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
        salesQuery.limit(limit).offset(page * limit);
      }

      const sales = await salesQuery;

      // Get all items for these sales in a single query
      const saleIds = sales.map((s) => s.sale.id);
      const items = await tx
        .select()
        .from(saleItemsTable)
        .where(
          and(
            inArray(saleItemsTable.saleId, saleIds),
            eq(saleItemsTable.isActive, true)
          )
        );

      // Combine the data
      const salesWithItems = sales.map((sale) => ({
        ...sale,
        products: items
          .filter((item) => item.saleId === sale.sale.id)
          .map((item) => ({
            id: item.id,
            lotNumber: item.lotNumber,
            inventoryStockId: item.inventoryStockId,
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
          })),
      }));

      // Get total count for pagination
      const total = getAllSales
        ? sales.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(salesTable)
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
      // Delete sale items first
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
      await tx
        .update(saleItemsTable)
        .set({ isActive: false })
        .where(eq(saleItemsTable.saleId, saleId));

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
