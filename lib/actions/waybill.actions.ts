"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import { WaybillFormValues } from "../validation";
import {
  saleItemsTable,
  salesTable,
  customersTable,
  storesTable,
  waybillsTable,
  waybillItemsTable,
  waybillItemInventoryTable,
  inventoryTable,
  inventoryTransactionsTable,
  productsTable,
} from "@/drizzle/schema";
import { DeliveryStatus } from "@/types";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { WaybillFilters } from "@/hooks/useWaybills";

// Add a new waybill
export const addWaybill = async (
  waybill: WaybillFormValues,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create main waybill record
      const [newWaybill] = await tx
        .insert(waybillsTable)
        .values({
          waybillDate: waybill.waybillDate,
          waybillRefNumber: waybill.waybillRefNumber,
          status: waybill.status as DeliveryStatus,
          deliveryAddress: waybill.deliveryAddress
            ? {
                addressName: waybill.deliveryAddress.addressName || "",
                address: waybill.deliveryAddress.address || "",
                city: waybill.deliveryAddress.city || "",
                state: waybill.deliveryAddress.state || "",
                country: waybill.deliveryAddress.country || "",
                email: waybill.deliveryAddress.email || "",
                phone: waybill.deliveryAddress.phone || "",
              }
            : null,
          customerId: waybill.customerId,
          storeId: waybill.storeId,
          saleId: waybill.saleId,
          deliveredBy: waybill.deliveredBy || "",
          receivedBy: waybill.receivedBy || "",
          notes: waybill.notes,
        })
        .returning();

      // Process each product in the waybill
      const waybillItems = [];
      for (const product of waybill.products) {
        // Create waybill item
        const [waybillItem] = await tx
          .insert(waybillItemsTable)
          .values({
            waybillId: newWaybill.id,
            productId: product.productId,
            saleItemId: product.saleItemId,
            quantityRequested: product.quantityRequested,
            quantitySupplied: product.quantitySupplied,
            balanceLeft: product.balanceLeft,
            fulfilledQuantity: product.fulfilledQuantity,
            productName: product.productName,
            productID: product.productID,
          })
          .returning();

        // Process supplied inventory stock
        for (const inventory of product.inventoryStock) {
          const [currentInventory] = await tx
            .select()
            .from(inventoryTable)
            .where(eq(inventoryTable.id, inventory.inventoryStockId))
            .limit(1);

          if (!currentInventory) {
            throw new Error(
              `Inventory stock with ID ${inventory.inventoryStockId} not found`
            );
          }

          // Check if we have enough quantity available
          if (currentInventory.quantity < inventory.quantityTaken) {
            throw new Error(
              `Insufficient stock available. Lot ${inventory.lotNumber} has ${currentInventory.quantity} available but ${inventory.quantityTaken} was requested. Please refresh and try again.`
            );
          }

          // Create waybill item inventory record
          await tx.insert(waybillItemInventoryTable).values({
            waybillItemId: waybillItem.id,
            inventoryStockId: inventory.inventoryStockId,
            lotNumber: inventory.lotNumber,
            quantityTaken: inventory.quantityTaken,
            unitPrice: inventory.unitPrice,
          });

          // Update inventory quantity
          const [updatedInventory] = await tx
            .update(inventoryTable)
            .set({
              quantity: sql`${inventoryTable.quantity} - ${inventory.quantityTaken}`,
            })
            .where(eq(inventoryTable.id, inventory.inventoryStockId))
            .returning();

          // Log the inventory transaction
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: inventory.inventoryStockId,
            productId: product.productId,
            storeId: waybill.storeId,
            userId: userId,
            transactionType: "sale",
            quantityBefore: updatedInventory.quantity + inventory.quantityTaken,
            quantityAfter: updatedInventory.quantity,
            transactionDate: new Date(),
            notes: `Stock reduced for sale`,
          });

          // Update product total quantity
          await tx
            .update(productsTable)
            .set({
              quantity: sql`${productsTable.quantity} - ${inventory.quantityTaken}`,
            })
            .where(eq(productsTable.id, product.productId));

          //Update sale item fulfillment
          await tx
            .update(saleItemsTable)
            .set({
              fulfilledQuantity: sql`${saleItemsTable.fulfilledQuantity} + ${inventory.quantityTaken}`,
            })
            .where(eq(saleItemsTable.id, product.saleItemId));
        }

        // Check if sale is fully fulfilled
        const saleItems = await tx
          .select()
          .from(saleItemsTable)
          .where(eq(saleItemsTable.saleId, waybill.saleId));

        const isFullyFulfilled = saleItems.every(
          (item) => item.quantity <= item.fulfilledQuantity
        );
        // mark sale as completed
        if (isFullyFulfilled) {
          await tx
            .update(salesTable)
            .set({ status: "completed" })
            .where(eq(salesTable.id, waybill.saleId));
        }
        // Handle promissory note update here...

        waybillItems.push(waybillItem);
      }

      return { waybill: newWaybill, items: waybillItems };
    });

    revalidatePath("/waybills");
    return parseStringify(result);
  } catch (error) {
    console.error("Error creating waybill:", error);
    throw error;
  }
};

// Get Waybill by ID
export const getWaybillById = async (waybillId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main waybill record
      const waybill = await tx
        .select({
          waybill: waybillsTable,
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
        })
        .from(waybillsTable)
        .leftJoin(salesTable, eq(waybillsTable.saleId, salesTable.id))
        .leftJoin(
          customersTable,
          eq(waybillsTable.customerId, customersTable.id)
        )
        .leftJoin(storesTable, eq(waybillsTable.storeId, storesTable.id))
        .where(
          and(eq(waybillsTable.id, waybillId), eq(waybillsTable.isActive, true))
        )
        .then((res) => res[0]);

      if (!waybill) return null;

      // Get all items for this waybill
      const items = await tx
        .select()
        .from(waybillItemsTable)
        .where(
          and(
            eq(waybillItemsTable.waybillId, waybillId),
            eq(waybillItemsTable.isActive, true)
          )
        );

      // Get all inventory records for these waybill items
      const waybillItemIds = items.map((item) => item.id);
      const inventoryRecords =
        waybillItemIds.length > 0
          ? await tx
              .select()
              .from(waybillItemInventoryTable)
              .where(
                and(
                  inArray(
                    waybillItemInventoryTable.waybillItemId,
                    waybillItemIds
                  ),
                  eq(waybillItemInventoryTable.isActive, true)
                )
              )
          : [];

      // Create a map of waybill item ID to its inventory records
      const inventoryMap = new Map();
      inventoryRecords.forEach((record) => {
        if (!inventoryMap.has(record.waybillItemId)) {
          inventoryMap.set(record.waybillItemId, []);
        }
        inventoryMap.get(record.waybillItemId).push(record);
      });

      return {
        ...waybill,
        products: items.map((item) => ({
          ...item,
          inventoryStock: inventoryMap.get(item.id) || [],
        })),
      };
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting waybill:", error);
    throw error;
  }
};

// Get all waybills with pagination
export const getWaybills = async (
  page: number = 0,
  limit: number = 10,
  getAllWaybills: boolean = false,
  filters?: WaybillFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create base query
      let waybillsQuery = tx
        .select({
          waybill: waybillsTable,
          sale: salesTable,
          customer: customersTable,
          store: storesTable,
        })
        .from(waybillsTable)
        .leftJoin(salesTable, eq(waybillsTable.saleId, salesTable.id))
        .leftJoin(
          customersTable,
          eq(waybillsTable.customerId, customersTable.id)
        )
        .leftJoin(storesTable, eq(waybillsTable.storeId, storesTable.id))
        .$dynamic();

      // Create conditions array
      const conditions = [eq(waybillsTable.isActive, true)];

      // Apply filters if provided
      if (filters) {
        // Waybill date range
        if (filters.waybillDate_start) {
          conditions.push(
            gte(waybillsTable.waybillDate, new Date(filters.waybillDate_start))
          );
        }
        if (filters.waybillDate_end) {
          conditions.push(
            lte(waybillsTable.waybillDate, new Date(filters.waybillDate_end))
          );
        }

        // Status filter
        if (filters.status) {
          conditions.push(
            eq(waybillsTable.status, filters.status as DeliveryStatus)
          );
        }
      }

      // Apply where conditions
      waybillsQuery = waybillsQuery.where(and(...conditions));

      // Apply order by
      waybillsQuery = waybillsQuery.orderBy(desc(waybillsTable.createdAt));

      if (!getAllWaybills) {
        waybillsQuery = waybillsQuery.limit(limit).offset(page * limit);
      }

      const waybills = await waybillsQuery;

      // Get all products for these wybills in a single query
      const waybillIds = waybills.map((bill) => bill.waybill.id);
      const items =
        waybillIds.length > 0
          ? await tx
              .select()
              .from(waybillItemsTable)
              .where(
                and(
                  inArray(waybillItemsTable.waybillId, waybillIds),
                  eq(waybillItemsTable.isActive, true)
                )
              )
          : [];

      // Create a map of waybill ID to its items
      const itemsMap = new Map();
      items.forEach((item) => {
        if (!itemsMap.has(item.waybillId)) {
          itemsMap.set(item.waybillId, []);
        }
        itemsMap.get(item.waybillId).push(item);
      });

      // Get total count for pagination
      const total = getAllWaybills
        ? waybills.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(waybillsTable)
            .where(and(...conditions))
            .then((res) => res[0]?.count || 0);

      return {
        documents: waybills.map((bill) => ({
          ...bill,
          products: itemsMap.get(bill.waybill.id) || [],
        })),
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting waybills:", error);
    throw error;
  }
};

// Edit Waybill
export const editWaybill = async (
  waybill: WaybillFormValues,
  waybillId: string,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      if (!userId) {
        throw new Error("User not found");
      }
      // Get the existing waybill with its items and inventory
      const existingWaybill = await tx
        .select()
        .from(waybillsTable)
        .where(eq(waybillsTable.id, waybillId))
        .then((res) => res[0]);

      if (!existingWaybill) {
        throw new Error("Waybill not found");
      }

      // Get existing waybill items and their inventory
      const existingItems = await tx
        .select()
        .from(waybillItemsTable)
        .where(eq(waybillItemsTable.waybillId, waybillId));

      const existingItemIds = existingItems.map((item) => item.id);
      const existingInventory =
        existingItemIds.length > 0
          ? await tx
              .select({
                waybillInv: waybillItemInventoryTable,
                waybillItem: waybillItemsTable,
              })
              .from(waybillItemInventoryTable)
              .leftJoin(
                waybillItemsTable,
                eq(
                  waybillItemInventoryTable.waybillItemId,
                  waybillItemsTable.id
                )
              )
              .where(
                inArray(
                  waybillItemInventoryTable.waybillItemId,
                  existingItemIds
                )
              )
          : [];

      // Reverse all existing inventory transactions (return stock)
      for (const invRecord of existingInventory) {
        if (!invRecord.waybillItem) {
          console.warn(
            `Waybill item not found for inventory record ${invRecord.waybillInv.id}`
          );
        }
        // Return inventory quantity
        await tx
          .update(inventoryTable)
          .set({
            quantity: sql`${inventoryTable.quantity} + ${invRecord.waybillInv.quantityTaken}`,
          })
          .where(eq(inventoryTable.id, invRecord.waybillInv.inventoryStockId));

        // Return product quantity
        await tx
          .update(productsTable)
          .set({
            quantity: sql`${productsTable.quantity} + ${invRecord.waybillInv.quantityTaken}`,
          })
          .where(eq(productsTable.id, invRecord.waybillItem?.productId ?? ""));

        // Get current inventory quantity for logging
        const currentInventory = await tx
          .select({ quantity: inventoryTable.quantity })
          .from(inventoryTable)
          .where(eq(inventoryTable.id, invRecord.waybillInv.inventoryStockId))
          .then((res) => res[0]);

        // Log the reversal transaction with actual quantities
        await tx.insert(inventoryTransactionsTable).values({
          inventoryId: invRecord.waybillInv.inventoryStockId,
          productId: invRecord.waybillItem?.productId ?? "",
          storeId: existingWaybill.storeId,
          userId: userId,
          transactionType: "waybill_edit_reversal",
          quantityBefore:
            currentInventory.quantity - invRecord.waybillInv.quantityTaken,
          quantityAfter: currentInventory.quantity,
          transactionDate: new Date(),
          notes: `Stock returned during waybill edit`,
        });

        // Update sale item fulfillment (reduce fulfilled quantity)
        const saleItemExists = await tx
          .select({ id: saleItemsTable.id })
          .from(saleItemsTable)
          .where(eq(saleItemsTable.id, invRecord.waybillItem?.saleItemId ?? ""))
          .then((res) => res.length > 0);

        if (saleItemExists) {
          await tx
            .update(saleItemsTable)
            .set({
              fulfilledQuantity: sql`GREATEST(0, ${saleItemsTable.fulfilledQuantity} - ${invRecord.waybillInv.quantityTaken})`,
            })
            .where(
              eq(saleItemsTable.id, invRecord.waybillItem?.saleItemId ?? "")
            );
        }
      }

      // Delete existing waybill item inventory records
      if (existingItemIds.length > 0) {
        await tx
          .delete(waybillItemInventoryTable)
          .where(
            inArray(waybillItemInventoryTable.waybillItemId, existingItemIds)
          );
      }

      // Delete existing waybill items
      await tx
        .delete(waybillItemsTable)
        .where(eq(waybillItemsTable.waybillId, waybillId));

      // Update main waybill record
      const [updatedWaybill] = await tx
        .update(waybillsTable)
        .set({
          waybillDate: waybill.waybillDate,
          waybillRefNumber: waybill.waybillRefNumber,
          status: waybill.status as DeliveryStatus,
          deliveryAddress: waybill.deliveryAddress
            ? {
                addressName: waybill.deliveryAddress.addressName || "",
                address: waybill.deliveryAddress.address || "",
                city: waybill.deliveryAddress.city || "",
                state: waybill.deliveryAddress.state || "",
                country: waybill.deliveryAddress.country || "",
                email: waybill.deliveryAddress.email || "",
                phone: waybill.deliveryAddress.phone || "",
              }
            : null,
          customerId: waybill.customerId,
          storeId: waybill.storeId,
          saleId: waybill.saleId,
          deliveredBy: waybill.deliveredBy,
          receivedBy: waybill.receivedBy,
          notes: waybill.notes,
        })
        .where(eq(waybillsTable.id, waybillId))
        .returning();

      // Process each product in the updated waybill
      const waybillItems = [];
      for (const product of waybill.products) {
        // Validate product data
        if (!product.productId || !product.saleItemId) {
          throw new Error(
            "Invalid product data: missing productId or saleItemId"
          );
        }

        // Create new waybill item
        const [waybillItem] = await tx
          .insert(waybillItemsTable)
          .values({
            waybillId: updatedWaybill.id,
            productId: product.productId,
            saleItemId: product.saleItemId,
            quantityRequested: product.quantityRequested,
            quantitySupplied: product.quantitySupplied,
            balanceLeft: product.balanceLeft,
            fulfilledQuantity: product.fulfilledQuantity,
            productName: product.productName,
            productID: product.productID,
          })
          .returning();

        // Process supplied inventory stock
        if (product.inventoryStock && product.inventoryStock.length > 0) {
          for (const inventory of product.inventoryStock) {
            // Validate inventory data
            if (
              !inventory.inventoryStockId ||
              !inventory.quantityTaken ||
              inventory.quantityTaken <= 0
            ) {
              console.warn("Invalid inventory data:", inventory);
              continue;
            }

            const [currentInventory] = await tx
              .select()
              .from(inventoryTable)
              .where(eq(inventoryTable.id, inventory.inventoryStockId))
              .limit(1);

            if (!currentInventory) {
              throw new Error(
                `Inventory stock with ID ${inventory.inventoryStockId} not found`
              );
            }

            // Check if we have enough quantity available
            if (currentInventory.quantity < inventory.quantityTaken) {
              throw new Error(
                `Insufficient stock available. Lot ${inventory.lotNumber} has ${currentInventory.quantity} available but ${inventory.quantityTaken} was requested. Please refresh and try again.`
              );
            }

            // Create waybill item inventory record
            await tx.insert(waybillItemInventoryTable).values({
              waybillItemId: waybillItem.id,
              inventoryStockId: inventory.inventoryStockId,
              lotNumber: inventory.lotNumber,
              quantityTaken: inventory.quantityTaken,
              unitPrice: inventory.unitPrice,
            });

            // Update inventory quantity
            const [updatedInventory] = await tx
              .update(inventoryTable)
              .set({
                quantity: sql`${inventoryTable.quantity} - ${inventory.quantityTaken}`,
              })
              .where(eq(inventoryTable.id, inventory.inventoryStockId))
              .returning();

            // Log the inventory transaction
            await tx.insert(inventoryTransactionsTable).values({
              inventoryId: inventory.inventoryStockId,
              productId: product.productId,
              storeId: waybill.storeId,
              userId: userId,
              transactionType: "waybill_edit",
              quantityBefore:
                updatedInventory.quantity + inventory.quantityTaken,
              quantityAfter: updatedInventory.quantity,
              transactionDate: new Date(),
              notes: `Stock reduced for waybill edit`,
            });

            // Update product total quantity
            await tx
              .update(productsTable)
              .set({
                quantity: sql`${productsTable.quantity} - ${inventory.quantityTaken}`,
              })
              .where(eq(productsTable.id, product.productId));

            // Update sale item fulfillment
            await tx
              .update(saleItemsTable)
              .set({
                fulfilledQuantity: sql`${saleItemsTable.fulfilledQuantity} + ${inventory.quantityTaken}`,
              })
              .where(eq(saleItemsTable.id, product.saleItemId));
          }
        }

        waybillItems.push(waybillItem);
      }

      // Recalculate sale fulfillment status
      const saleItems = await tx
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, waybill.saleId));

      const isFullyFulfilled = saleItems.every(
        (item) => item.quantity <= item.fulfilledQuantity
      );

      if (isFullyFulfilled) {
        await tx
          .update(salesTable)
          .set({ status: "completed" })
          .where(eq(salesTable.id, waybill.saleId));
      }

      return { waybill: updatedWaybill, items: waybillItems };
    });

    revalidatePath("/waybills");
    return parseStringify(result);
  } catch (error) {
    console.error("Error editing waybill:", error);
    throw error;
  }
};
// Permanently delete Waybill
export const deleteWaybill = async (waybillId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get waybill items
      const waybillItems = await tx
        .select()
        .from(waybillItemsTable)
        .where(eq(waybillItemsTable.waybillId, waybillId));

      // Delete waybill item inventory records
      const waybillItemIds = waybillItems.map((item) => item.id);
      if (waybillItemIds.length > 0) {
        await tx
          .delete(waybillItemInventoryTable)
          .where(
            inArray(waybillItemInventoryTable.waybillItemId, waybillItemIds)
          );
      }

      // Delete waybill items
      await tx
        .delete(waybillItemsTable)
        .where(eq(waybillItemsTable.waybillId, waybillId));

      // Delete the main waybill record
      const [deletedWaybill] = await tx
        .delete(waybillsTable)
        .where(eq(waybillsTable.id, waybillId))
        .returning();

      return deletedWaybill;
    });

    revalidatePath("/waybills");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting waybill:", error);
    throw error;
  }
};

// Soft delete waybill
export const softDeleteWaybill = async (waybillId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Soft delete waybill items and their inventory
      const waybillItems = await tx
        .update(waybillItemsTable)
        .set({ isActive: false })
        .where(eq(waybillItemsTable.waybillId, waybillId))
        .returning();

      const waybillItemIds = waybillItems.map((item) => item.id);
      if (waybillItemIds.length > 0) {
        await tx
          .update(waybillItemInventoryTable)
          .set({ isActive: false })
          .where(
            inArray(waybillItemInventoryTable.waybillItemId, waybillItemIds)
          );
      }

      // Soft delete main waybill record
      const [updatedWaybill] = await tx
        .update(waybillsTable)
        .set({ isActive: false })
        .where(eq(waybillsTable.id, waybillId))
        .returning();

      return updatedWaybill;
    });

    revalidatePath("/waybills");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting waybill:", error);
    throw error;
  }
};

// Generate waybill reference number
export const generateWaybillRefNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastWaybill = await tx
        .select({ waybillRefNumber: waybillsTable.waybillRefNumber })
        .from(waybillsTable)
        .where(sql`waybill_ref_number LIKE ${`WB${year}/${month}/%`}`)
        .orderBy(desc(waybillsTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastWaybill.length > 0) {
        const lastRefNumber = lastWaybill[0].waybillRefNumber;
        const lastSequence = parseInt(
          lastRefNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");
      return `WB${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating waybill reference number:", error);
    throw error;
  }
};
