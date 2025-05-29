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
  saleItemInventoryTable,
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

          // Handle sale item inventory stock
          for (const inventory of product.inventoryStock) {
            if (!inventory.inventoryStockId) {
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

              // create sale item invetory
              await tx.insert(saleItemInventoryTable).values({
                saleItemId: saleItem.id,
                inventoryStockId: newInventory.id,
                lotNumber: newInventory.lotNumber,
                quantityToTake: inventory.quantityToTake,
              });

              // Update inventory to reflect negative quantity (backorder)
              await tx
                .update(inventoryTable)
                .set({
                  quantity: -inventory.quantityToTake,
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
                quantityAfter: -inventory.quantityToTake,
                transactionDate: new Date(),
                notes: `Backorder quantity updated`,
              });

              // Update product total quantity
              await tx
                .update(productsTable)
                .set({
                  quantity: sql`${productsTable.quantity} - ${inventory.quantityToTake}`,
                })
                .where(eq(productsTable.id, product.productId));
            } else {
              // create sale item invetory
              await tx.insert(saleItemInventoryTable).values({
                saleItemId: saleItem.id,
                inventoryStockId: inventory.inventoryStockId,
                lotNumber: inventory.lotNumber,
                quantityToTake: inventory.quantityToTake,
              });
              // Update inventory quantity
              const [updatedInventory] = await tx
                .update(inventoryTable)
                .set({
                  quantity: sql`${inventoryTable.quantity} - ${inventory.quantityToTake}`,
                })
                .where(eq(inventoryTable.id, inventory.inventoryStockId))
                .returning();

              // Log the inventory transaction
              await tx.insert(inventoryTransactionsTable).values({
                inventoryId: inventory.inventoryStockId,
                productId: product.productId,
                storeId: sale.storeId,
                userId: userId,
                transactionType: "sale",
                quantityBefore:
                  updatedInventory.quantity - inventory.quantityToTake,
                quantityAfter: updatedInventory.quantity,
                transactionDate: new Date(),
                notes: `Stock reduced for sale`,
              });

              // Update product total quantity
              await tx
                .update(productsTable)
                .set({
                  quantity: sql`${productsTable.quantity} - ${inventory.quantityToTake}`,
                })
                .where(eq(productsTable.id, product.productId));
            }
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

        // Get existing sale items with their inventory relationships
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
          })
          .from(saleItemsTable)
          .where(eq(saleItemsTable.saleId, saleId));

        // Get existing sale item inventory relationships
        const existingSaleItemInventory = await tx
          .select()
          .from(saleItemInventoryTable)
          .where(
            inArray(
              saleItemInventoryTable.saleItemId,
              existingSaleItems.map((item) => item.id)
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

        // Match existing items with new items
        // We'll use a combination of productId and order for matching
        const itemsToDelete: any = [];
        const itemsToUpdate: any = [];
        const itemsToCreate: any = [];

        // Create a simple matching system based on product order
        const newProductsFlattened: any = [];
        sale.products.forEach((product) => {
          product.inventoryStock.forEach((inventory) => {
            newProductsFlattened.push({
              ...product,
              inventory,
            });
          });
        });

        // Match existing items with new items by order and productId
        const matchedExistingItems = new Set();
        const matchedNewItems = new Set();

        // First pass: match by productId and order
        for (
          let i = 0;
          i < Math.min(existingSaleItems.length, newProductsFlattened.length);
          i++
        ) {
          const existingItem = existingSaleItems[i];
          const newItem = newProductsFlattened[i];

          if (existingItem.productId === newItem.productId) {
            itemsToUpdate.push({
              existing: existingItem,
              new: newItem,
              existingInventory:
                saleItemInventoryMap.get(existingItem.id) || [],
            });
            matchedExistingItems.add(i);
            matchedNewItems.add(i);
          }
        }

        // Second pass: handle unmatched items
        existingSaleItems.forEach((item, index) => {
          if (!matchedExistingItems.has(index)) {
            itemsToDelete.push({
              item,
              inventory: saleItemInventoryMap.get(item.id) || [],
            });
          }
        });

        newProductsFlattened.forEach((item: any, index: number) => {
          if (!matchedNewItems.has(index)) {
            itemsToCreate.push(item);
          }
        });

        // Process deletions first
        for (const { item, inventory } of itemsToDelete) {
          // Reverse inventory changes for each inventory record
          for (const invRecord of inventory) {
            if (invRecord.inventoryStockId) {
              // Get current inventory before reversal
              const [currentInventory] = await tx
                .select()
                .from(inventoryTable)
                .where(eq(inventoryTable.id, invRecord.inventoryStockId));

              if (currentInventory) {
                // Update inventory quantity (add back the quantity)
                const [updatedInventory] = await tx
                  .update(inventoryTable)
                  .set({
                    quantity: sql`${inventoryTable.quantity} + ${invRecord.quantityToTake}`,
                  })
                  .where(eq(inventoryTable.id, invRecord.inventoryStockId))
                  .returning();

                // Log the inventory reversal transaction
                await tx.insert(inventoryTransactionsTable).values({
                  inventoryId: invRecord.inventoryStockId,
                  productId: item.productId,
                  storeId: updatedSale.storeId,
                  userId: userId,
                  transactionType: "sale_reversal",
                  quantityBefore:
                    updatedInventory.quantity - invRecord.quantityToTake,
                  quantityAfter: updatedInventory.quantity,
                  transactionDate: new Date(),
                  referenceId: updatedSale.id,
                  notes: `Stock restored from sale edit - item removed`,
                });
              }
            }

            // Delete sale item inventory record
            await tx
              .delete(saleItemInventoryTable)
              .where(eq(saleItemInventoryTable.id, invRecord.id));
          }

          // Update product total quantity
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} + ${item.quantity}`,
            })
            .where(eq(productsTable.id, item.productId));

          // Delete the sale item
          await tx.delete(saleItemsTable).where(eq(saleItemsTable.id, item.id));
        }

        // Process updates
        const updatedItems = [];
        for (const {
          existing: existingItem,
          new: newProduct,
          existingInventory,
        } of itemsToUpdate) {
          // Update the sale item
          const [updatedItem] = await tx
            .update(saleItemsTable)
            .set({
              quantity: newProduct.quantity,
              unitPrice: newProduct.unitPrice,
              totalPrice: newProduct.totalPrice,
              subTotal: newProduct.subTotal,
              taxAmount: newProduct.taxAmount,
              discountAmount: newProduct.discountAmount,
              discountRate: newProduct.discountRate,
              taxRate: newProduct.taxRate,
              taxRateId: newProduct.taxRateId,
              productName: newProduct.productName,
              productID: newProduct.productID,
            })
            .where(eq(saleItemsTable.id, existingItem.id))
            .returning();

          // Handle inventory changes
          const oldQuantity = existingItem.quantity;
          const newQuantity = newProduct.quantity;
          const quantityDifference = newQuantity - oldQuantity;

          // Delete existing sale item inventory records
          for (const invRecord of existingInventory) {
            if (invRecord.inventoryStockId) {
              // Reverse the old inventory transaction
              const [currentInventory] = await tx
                .select()
                .from(inventoryTable)
                .where(eq(inventoryTable.id, invRecord.inventoryStockId));

              if (currentInventory) {
                const [updatedInventory] = await tx
                  .update(inventoryTable)
                  .set({
                    quantity: sql`${inventoryTable.quantity} + ${invRecord.quantityToTake}`,
                  })
                  .where(eq(inventoryTable.id, invRecord.inventoryStockId))
                  .returning();

                // Log the reversal transaction
                await tx.insert(inventoryTransactionsTable).values({
                  inventoryId: invRecord.inventoryStockId,
                  productId: newProduct.productId,
                  storeId: updatedSale.storeId,
                  userId: userId,
                  transactionType: "sale_reversal",
                  quantityBefore:
                    updatedInventory.quantity - invRecord.quantityToTake,
                  quantityAfter: updatedInventory.quantity,
                  transactionDate: new Date(),
                  referenceId: updatedSale.id,
                  notes: `Stock restored from sale edit - before update`,
                });
              }
            }

            // Delete the old sale item inventory record
            await tx
              .delete(saleItemInventoryTable)
              .where(eq(saleItemInventoryTable.id, invRecord.id));
          }

          // Create new sale item inventory records
          if (!newProduct.inventory.inventoryStockId) {
            // Create backorder inventory
            const [newInventory] = await tx
              .insert(inventoryTable)
              .values({
                productId: newProduct.productId,
                storeId: updatedSale.storeId,
                lotNumber: `BackOrder-${Date.now()}`,
                quantity: 0,
                costPrice: 0,
                sellingPrice: newProduct.unitPrice,
                manufactureDate: null,
                expiryDate: null,
                receivedDate: new Date(),
              })
              .returning();

            // Log initial inventory transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: newInventory.id,
              productId: newProduct.productId,
              storeId: updatedSale.storeId,
              userId: userId,
              transactionType: "sale",
              quantityBefore: 0,
              quantityAfter: 0,
              transactionDate: new Date(),
              referenceId: updatedSale.id,
              notes: `Backorder stock created from sale edit`,
            });

            // Create sale item inventory record
            await tx.insert(saleItemInventoryTable).values({
              saleItemId: updatedItem.id,
              inventoryStockId: newInventory.id,
              lotNumber: newInventory.lotNumber,
              quantityToTake: newProduct.inventory.quantityToTake,
            });

            // Update inventory to reflect negative quantity (backorder)
            await tx
              .update(inventoryTable)
              .set({
                quantity: -newProduct.inventory.quantityToTake,
              })
              .where(eq(inventoryTable.id, newInventory.id));

            // Log the backorder transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: newInventory.id,
              productId: newProduct.productId,
              storeId: updatedSale.storeId,
              userId: userId,
              transactionType: "sale",
              quantityBefore: 0,
              quantityAfter: -newProduct.inventory.quantityToTake,
              transactionDate: new Date(),
              referenceId: updatedSale.id,
              notes: `Backorder quantity updated from sale edit`,
            });
          } else {
            // Handle existing inventory stock
            // Create sale item inventory record
            await tx.insert(saleItemInventoryTable).values({
              saleItemId: updatedItem.id,
              inventoryStockId: newProduct.inventory.inventoryStockId,
              lotNumber: newProduct.inventory.lotNumber,
              quantityToTake: newProduct.inventory.quantityToTake,
            });

            // Update inventory quantity
            const [updatedInventory] = await tx
              .update(inventoryTable)
              .set({
                quantity: sql`${inventoryTable.quantity} - ${newProduct.inventory.quantityToTake}`,
              })
              .where(
                eq(inventoryTable.id, newProduct.inventory.inventoryStockId)
              )
              .returning();

            // Log the inventory transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: newProduct.inventory.inventoryStockId,
              productId: newProduct.productId,
              storeId: updatedSale.storeId,
              userId: userId,
              transactionType: "sale",
              quantityBefore:
                updatedInventory.quantity + newProduct.inventory.quantityToTake,
              quantityAfter: updatedInventory.quantity,
              transactionDate: new Date(),
              referenceId: updatedSale.id,
              notes: `Stock reduced for sale edit - item updated`,
            });
          }

          // Update product total quantity with the difference
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} - ${quantityDifference}`,
            })
            .where(eq(productsTable.id, newProduct.productId));

          updatedItems.push(updatedItem);
        }

        // Process new items
        const createdItems = [];
        for (const product of itemsToCreate) {
          // Create sale item
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

          // Handle inventory stock
          if (!product.inventory.inventoryStockId) {
            // Create backorder inventory
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
              referenceId: updatedSale.id,
              notes: `Backorder stock created from sale edit - new item`,
            });

            // Create sale item inventory record
            await tx.insert(saleItemInventoryTable).values({
              saleItemId: saleItem.id,
              inventoryStockId: newInventory.id,
              lotNumber: newInventory.lotNumber,
              quantityToTake: product.inventory.quantityToTake,
            });

            // Update inventory to reflect negative quantity (backorder)
            await tx
              .update(inventoryTable)
              .set({
                quantity: -product.inventory.quantityToTake,
              })
              .where(eq(inventoryTable.id, newInventory.id));

            // Log the backorder transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: newInventory.id,
              productId: product.productId,
              storeId: updatedSale.storeId,
              userId: userId,
              transactionType: "sale",
              quantityBefore: 0,
              quantityAfter: -product.inventory.quantityToTake,
              transactionDate: new Date(),
              referenceId: updatedSale.id,
              notes: `Backorder quantity updated from sale edit - new item`,
            });
          } else {
            // Handle existing inventory stock
            // Create sale item inventory record
            await tx.insert(saleItemInventoryTable).values({
              saleItemId: saleItem.id,
              inventoryStockId: product.inventory.inventoryStockId,
              lotNumber: product.inventory.lotNumber,
              quantityToTake: product.inventory.quantityToTake,
            });

            // Update inventory quantity
            const [updatedInventory] = await tx
              .update(inventoryTable)
              .set({
                quantity: sql`${inventoryTable.quantity} - ${product.inventory.quantityToTake}`,
              })
              .where(eq(inventoryTable.id, product.inventory.inventoryStockId))
              .returning();

            // Log the inventory transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: product.inventory.inventoryStockId,
              productId: product.productId,
              storeId: updatedSale.storeId,
              userId: userId,
              transactionType: "sale",
              quantityBefore:
                updatedInventory.quantity + product.inventory.quantityToTake,
              quantityAfter: updatedInventory.quantity,
              transactionDate: new Date(),
              referenceId: updatedSale.id,
              notes: `Stock reduced for sale edit - new item`,
            });
          }

          // Update product total quantity
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} - ${product.quantity}`,
            })
            .where(eq(productsTable.id, product.productId));

          createdItems.push(saleItem);
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
          items: [...updatedItems, ...createdItems],
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
              .where(inArray(saleItemInventoryTable.saleItemId, saleItemIds))
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

      const saleWithItems = {
        ...sale,
        products: items.map((item) => ({
          id: item.id,
          inventoryStock: inventoryMap.get(item.id) || [],
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
              .where(inArray(saleItemInventoryTable.saleItemId, saleItemIds))
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

      // Combine the data
      const salesWithItems = sales.map((sale) => ({
        ...sale,
        products: items
          .filter((item) => item.saleId === sale.sale.id)
          .map((item) => ({
            id: item.id,
            inventoryStock: inventoryMap.get(item.id) || [],
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
      const [updatedSaleItem] = await tx
        .update(saleItemsTable)
        .set({ isActive: false })
        .where(eq(saleItemsTable.saleId, saleId))
        .returning();

      await tx
        .update(saleItemInventoryTable)
        .set({ isActive: false })
        .where(eq(saleItemInventoryTable.saleItemId, updatedSaleItem.id));

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
