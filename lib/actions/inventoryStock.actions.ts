/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import {
  backordersTable,
  inventoryTable,
  inventoryTransactionsTable,
  productsTable,
  saleItemInventoryTable,
  saleItemsTable,
  storesTable,
  usersTable,
} from "@/drizzle/schema";
import {
  eq,
  and,
  desc,
  sql,
  gte,
  lte,
  asc,
  gt,
  ilike,
  or,
  inArray,
} from "drizzle-orm";
import { ExistingStockAdjustmentFormValues } from "../validation";
import { ExtendedStockAdjustmentFormValues } from "@/components/forms/NewStockForm";
import { InventoryStockFilters } from "@/hooks/useInventoryStock";
import { InventoryTransactionType, SaleBackorder, SaleItem } from "@/types";
import { InventoryTransactionsFilters } from "@/hooks/useInventoryStockTransactions";

// --- buildTransactionsFilterConditions Function ---
const buildTransactionsFilterConditions = (
  filters: InventoryTransactionsFilters
) => {
  const conditions = [];
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(productsTable.name, searchTerm),
        ilike(productsTable.productID, searchTerm),
        ilike(productsTable.description, searchTerm),
        ilike(storesTable.name, searchTerm),
        ilike(inventoryTable.lotNumber, searchTerm)
      )
    );
  }
  if (filters.productId) {
    conditions.push(
      eq(inventoryTransactionsTable.productId, filters.productId)
    );
  }
  if (filters.storeId) {
    conditions.push(eq(inventoryTransactionsTable.storeId, filters.storeId));
  }
  if (filters.transactionType) {
    conditions.push(
      eq(
        inventoryTransactionsTable.transactionType,
        filters.transactionType as InventoryTransactionType
      )
    );
  }
  if (filters.transactionDate_start) {
    conditions.push(
      gte(
        inventoryTransactionsTable.transactionDate,
        new Date(filters.transactionDate_start)
      )
    );
  }
  if (filters.transactionDate_end) {
    conditions.push(
      lte(
        inventoryTransactionsTable.transactionDate,
        new Date(filters.transactionDate_end)
      )
    );
  }
  return conditions;
};

// --- buildStockFilterConditions Function ---
const buildStockFilterConditions = (filters: InventoryStockFilters) => {
  const conditions = [];
  conditions.push(eq(inventoryTable.isActive, true));
  conditions.push(gt(inventoryTable.quantity, 0));
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(inventoryTable.lotNumber, searchTerm),
        ilike(productsTable.name, searchTerm),
        ilike(productsTable.productID, searchTerm),
        ilike(productsTable.description, searchTerm),
        ilike(storesTable.name, searchTerm)
      )
    );
  }
  if (filters.quantity_min) {
    conditions.push(gte(inventoryTable.quantity, filters.quantity_min));
  }
  if (filters.quantity_max) {
    conditions.push(lte(inventoryTable.quantity, filters.quantity_max));
  }
  if (filters.costPrice_min) {
    conditions.push(gte(inventoryTable.costPrice, filters.costPrice_min));
  }
  if (filters.costPrice_max) {
    conditions.push(lte(inventoryTable.costPrice, filters.costPrice_max));
  }
  if (filters.sellingPrice_min) {
    conditions.push(gte(inventoryTable.sellingPrice, filters.sellingPrice_min));
  }
  if (filters.sellingPrice_max) {
    conditions.push(lte(inventoryTable.sellingPrice, filters.sellingPrice_max));
  }
  if (filters.expiryDate_start) {
    conditions.push(
      gte(inventoryTable.expiryDate, new Date(filters.expiryDate_start))
    );
  }
  if (filters.expiryDate_end) {
    conditions.push(
      lte(inventoryTable.expiryDate, new Date(filters.expiryDate_end))
    );
  }
  if (filters.manufactureDate_start) {
    conditions.push(
      gte(
        inventoryTable.manufactureDate,
        new Date(filters.manufactureDate_start)
      )
    );
  }
  if (filters.manufactureDate_end) {
    conditions.push(
      lte(inventoryTable.manufactureDate, new Date(filters.manufactureDate_end))
    );
  }
  if (filters.store) {
    conditions.push(eq(storesTable.id, filters.store));
  }
  return conditions;
};

export const fulfillBackorders = async (
  productId: string,
  storeId: string,
  newInventoryId: string,
  userId: string,
  tx: any
) => {
  try {
    const pendingBackorders = await tx
      .select()
      .from(backordersTable)
      .where(
        and(
          eq(backordersTable.productId, productId),
          eq(backordersTable.storeId, storeId),
          eq(backordersTable.isActive, true),
          gt(backordersTable.pendingQuantity, 0)
        )
      )
      .orderBy(asc(backordersTable.createdAt))
      .for("update");

    if (pendingBackorders.length === 0) {
      return { provisionedCount: 0 };
    }

    const [newInventory] = await tx
      .select()
      .from(inventoryTable)
      .where(
        and(
          eq(inventoryTable.id, newInventoryId),
          eq(inventoryTable.isActive, true)
        )
      )
      .for("update");

    if (
      !newInventory ||
      newInventory.isActive === false ||
      newInventory.quantity <= 0
    ) {
      console.warn(
        `Inventory batch ${newInventoryId} not available for backorder fulfillment.`
      );
      return { provisionedCount: 0 };
    }

    let remainingQtyInNewBatch = newInventory.quantity;

    const saleItemInventoryToInsert: (typeof saleItemInventoryTable.$inferInsert)[] =
      [];
    const inventoryTransactionsToInsert: (typeof inventoryTransactionsTable.$inferInsert)[] =
      [];

    const backorderUpdates = new Map<string, { newPendingQuantity: number }>();
    const saleItemBackorderUpdates = new Map<string, number>();

    const affectedSaleItemIds: string[] = [
      ...new Set(
        pendingBackorders.map((bo: SaleBackorder) => bo.saleItemId) as string[]
      ),
    ];

    const affectedSaleItems = await tx
      .select()
      .from(saleItemsTable)
      .where(inArray(saleItemsTable.id, affectedSaleItemIds))
      .for("update");

    const affectedSaleItemsMap = new Map<string, SaleItem>(
      affectedSaleItems.map((si: SaleItem) => [si.id, si])
    );

    for (const backorder of pendingBackorders) {
      if (remainingQtyInNewBatch <= 0) break;

      const quantityToFulfillFromThisBatch = Math.min(
        remainingQtyInNewBatch,
        backorder.pendingQuantity
      );

      if (quantityToFulfillFromThisBatch > 0) {
        saleItemInventoryToInsert.push({
          saleItemId: backorder.saleItemId,
          inventoryStockId: newInventoryId,
          lotNumber: newInventory.lotNumber,
          quantityToTake: quantityToFulfillFromThisBatch,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        backorderUpdates.set(backorder.id, {
          newPendingQuantity:
            backorder.pendingQuantity - quantityToFulfillFromThisBatch,
        });

        saleItemBackorderUpdates.set(
          backorder.saleItemId,
          (saleItemBackorderUpdates.get(backorder.saleItemId) || 0) +
            quantityToFulfillFromThisBatch
        );

        inventoryTransactionsToInsert.push({
          inventoryId: newInventoryId,
          productId: productId,
          storeId: storeId,
          userId: userId,
          transactionType: "backorder_fulfillment",
          quantityBefore: backorder.pendingQuantity,
          quantityAfter:
            backorder.pendingQuantity - quantityToFulfillFromThisBatch,
          transactionDate: new Date(),
          referenceId: backorder.saleItemId,
          notes: `Backorder provisioned with ${quantityToFulfillFromThisBatch} units from lot ${newInventory.lotNumber}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        remainingQtyInNewBatch -= quantityToFulfillFromThisBatch;
      }
    }

    await Promise.all(
      Array.from(backorderUpdates.entries()).map(
        ([id, { newPendingQuantity }]) =>
          tx
            .update(backordersTable)
            .set({
              pendingQuantity: newPendingQuantity,
              isActive: newPendingQuantity > 0,
              updatedAt: new Date(),
            })
            .where(eq(backordersTable.id, id))
      )
    );

    await Promise.all(
      Array.from(saleItemBackorderUpdates.entries()).map(
        async ([saleItemId, quantityReducedFromBackorder]) => {
          const currentSaleItem = affectedSaleItemsMap.get(saleItemId);
          if (currentSaleItem) {
            const newBackorderQuantity =
              currentSaleItem.backorderQuantity - quantityReducedFromBackorder;
            return tx
              .update(saleItemsTable)
              .set({
                backorderQuantity: newBackorderQuantity,
                hasBackorder: newBackorderQuantity > 0,
                updatedAt: new Date(),
              })
              .where(eq(saleItemsTable.id, saleItemId));
          }
          return Promise.resolve();
        }
      )
    );

    if (saleItemInventoryToInsert.length > 0) {
      await tx.insert(saleItemInventoryTable).values(saleItemInventoryToInsert);
    }
    if (inventoryTransactionsToInsert.length > 0) {
      await tx
        .insert(inventoryTransactionsTable)
        .values(inventoryTransactionsToInsert);
    }

    const totalProvisionedByThisCall =
      newInventory.quantity - remainingQtyInNewBatch;
    return { provisionedCount: totalProvisionedByThisCall };
  } catch (error) {
    console.error("Error in fulfillBackorders: ", error);
    throw error;
  }
};

// --- revertBackorderFulfillment Function ---
export const revertBackorderFulfillment = async (
  tx: any,
  affectedInventoryId: string,
  quantityToRevert: number,
  userId: string
) => {
  if (quantityToRevert <= 0) return;

  try {
    const linkedSaleItemInventories = await tx
      .select()
      .from(saleItemInventoryTable)
      .where(
        and(
          eq(saleItemInventoryTable.inventoryStockId, affectedInventoryId),
          gt(saleItemInventoryTable.quantityToTake, 0),
          eq(saleItemInventoryTable.isActive, true)
        )
      )
      .orderBy(desc(saleItemInventoryTable.createdAt))
      .for("update");

    if (linkedSaleItemInventories.length === 0) {
      return;
    }

    let remainingRevertQty = quantityToRevert;
    const backorderUpdates = new Map<string, { newPendingQuantity: number }>();
    const saleItemBackorderUpdates = new Map<string, number>();

    const affectedSaleItemIds = [
      ...new Set(
        linkedSaleItemInventories.map(
          (link: typeof saleItemInventoryTable.$inferSelect) => link.saleItemId
        ) as string[]
      ),
    ];

    const affectedBackorders = await tx
      .select()
      .from(backordersTable)
      .where(inArray(backordersTable.saleItemId, affectedSaleItemIds))
      .for("update");

    const affectedSaleItems = await tx
      .select()
      .from(saleItemsTable)
      .where(inArray(saleItemsTable.id, affectedSaleItemIds))
      .for("update");

    const backorderMap = new Map<
      string,
      (typeof backordersTable.$inferSelect)[]
    >();
    affectedBackorders.forEach((bo: SaleBackorder) => {
      if (!backorderMap.has(bo.saleItemId)) backorderMap.set(bo.saleItemId, []);
      backorderMap.get(bo.saleItemId)?.push(bo);
    });

    const saleItemMap = new Map<string, typeof saleItemsTable.$inferSelect>(
      affectedSaleItems.map((si: typeof saleItemsTable.$inferSelect) => [
        si.id,
        si,
      ])
    );

    const inventoryTransactionsToInsert: (typeof inventoryTransactionsTable.$inferInsert)[] =
      [];

    for (const link of linkedSaleItemInventories) {
      if (remainingRevertQty <= 0) break;

      const saleItemId = link.saleItemId;
      const saleItem = saleItemMap.get(saleItemId);
      if (!saleItem) continue;

      const revertAmountForLink = Math.min(
        remainingRevertQty,
        link.quantityToTake
      );

      if (revertAmountForLink > 0) {
        await tx
          .update(saleItemInventoryTable)
          .set({
            quantityToTake: link.quantityToTake - revertAmountForLink,
            isActive: link.quantityToTake - revertAmountForLink > 0,
            updatedAt: new Date(),
          })
          .where(eq(saleItemInventoryTable.id, link.id));

        const backordersForSaleItem = backorderMap.get(saleItemId) || [];
        const targetBackorder =
          backordersForSaleItem.find(
            (bo) =>
              bo.productId === saleItem.productId &&
              bo.storeId === saleItem.storeId &&
              bo.isActive === false &&
              bo.pendingQuantity === 0
          ) ||
          backordersForSaleItem.find(
            (bo) =>
              bo.productId === saleItem.productId &&
              bo.storeId === saleItem.storeId
          );

        if (targetBackorder) {
          const currentBoUpdate = backorderUpdates.get(targetBackorder.id) || {
            newPendingQuantity: targetBackorder.pendingQuantity,
          };
          currentBoUpdate.newPendingQuantity += revertAmountForLink;
          backorderUpdates.set(targetBackorder.id, currentBoUpdate);
        } else {
          await tx.insert(backordersTable).values({
            productId: saleItem.productId,
            storeId: saleItem.storeId,
            saleItemId: saleItemId,
            pendingQuantity: revertAmountForLink,
            originalPendingQuantity: revertAmountForLink,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        saleItemBackorderUpdates.set(
          saleItemId,
          (saleItemBackorderUpdates.get(saleItemId) || 0) + revertAmountForLink
        );

        inventoryTransactionsToInsert.push({
          inventoryId: affectedInventoryId,
          productId: saleItem.productId,
          storeId: saleItem.storeId,
          userId: userId,
          transactionType: "backorder_reversal" as InventoryTransactionType,
          quantityBefore: targetBackorder?.pendingQuantity || 0,
          quantityAfter:
            (targetBackorder?.pendingQuantity || 0) + revertAmountForLink,
          transactionDate: new Date(),
          referenceId: saleItem.id,
          notes: `Backorder reinstated by ${revertAmountForLink} units due to inventory adjustment`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        remainingRevertQty -= revertAmountForLink;
      }
    }

    await Promise.all(
      Array.from(backorderUpdates.entries()).map(
        ([backorderId, { newPendingQuantity }]) =>
          tx
            .update(backordersTable)
            .set({
              pendingQuantity: newPendingQuantity,
              isActive: newPendingQuantity > 0,
              updatedAt: new Date(),
            })
            .where(eq(backordersTable.id, backorderId))
      )
    );

    await Promise.all(
      Array.from(saleItemBackorderUpdates.entries()).map(
        ([saleItemId, delta]) => {
          const currentSaleItem = saleItemMap.get(saleItemId);
          if (currentSaleItem) {
            const newBackorderQuantity =
              currentSaleItem.backorderQuantity + delta;
            return tx
              .update(saleItemsTable)
              .set({
                backorderQuantity: newBackorderQuantity,
                hasBackorder: newBackorderQuantity > 0,
                updatedAt: new Date(),
              })
              .where(eq(saleItemsTable.id, saleItemId));
          }
          return Promise.resolve();
        }
      )
    );

    if (inventoryTransactionsToInsert.length > 0) {
      await tx
        .insert(inventoryTransactionsTable)
        .values(inventoryTransactionsToInsert);
    }
  } catch (error) {
    console.error("Error reverting backorder fulfillment:", error);
    throw error;
  }
};

// --- addInventoryStock Function ---
export const addInventoryStock = async (
  data: ExtendedStockAdjustmentFormValues,
  userId: string
) => {
  try {
    const { storeId, receivedDate, products, notes } = data;

    const result = await db.transaction(async (tx) => {
      const backorderFulfillmentCandidates: {
        productId: string;
        storeId: string;
        inventoryId: string;
      }[] = [];

      const productIdsInInput = products.map((p) => p.productId);
      const existingInventories = await tx
        .select()
        .from(inventoryTable)
        .where(
          and(
            eq(inventoryTable.storeId, storeId),
            eq(inventoryTable.isActive, true),
            inArray(inventoryTable.productId, productIdsInInput)
          )
        );

      const existingInventoryMap = new Map<
        string,
        typeof inventoryTable.$inferSelect
      >();
      existingInventories.forEach((inv) =>
        existingInventoryMap.set(`${inv.productId}-${inv.lotNumber}`, inv)
      );

      // Process each product
      for (const product of products) {
        const key = `${product.productId}-${product.lotNumber}`;
        const existingInventory = existingInventoryMap.get(key);

        if (existingInventory) {
          // UPDATE existing inventory
          const oldQuantity = existingInventory.quantity;
          const newQuantity = existingInventory.quantity + product.quantity;

          await tx
            .update(inventoryTable)
            .set({
              quantity: newQuantity,
              costPrice: product.costPrice,
              sellingPrice: product.sellingPrice,
              manufactureDate: product.manufactureDate,
              expiryDate: product.expiryDate,
              receivedDate: receivedDate,
              updatedAt: new Date(),
            })
            .where(eq(inventoryTable.id, existingInventory.id));

          // Log transaction for update
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: existingInventory.id,
            productId: product.productId,
            storeId,
            userId: userId,
            transactionType: "adjustment",
            quantityBefore: oldQuantity,
            quantityAfter: newQuantity,
            transactionDate: new Date(),
            notes: `Stock adjustment: Added ${
              product.quantity
            } units to existing lot ${product.lotNumber}. ${notes || ""}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          backorderFulfillmentCandidates.push({
            productId: product.productId,
            storeId,
            inventoryId: existingInventory.id,
          });
        } else {
          // INSERT new inventory - let DB generate ID
          const [newInventory] = await tx
            .insert(inventoryTable)
            .values({
              productId: product.productId,
              storeId,
              lotNumber: product.lotNumber,
              quantity: product.quantity,
              costPrice: product.costPrice,
              sellingPrice: product.sellingPrice,
              manufactureDate: product.manufactureDate,
              expiryDate: product.expiryDate,
              receivedDate: receivedDate,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          // Now use the ACTUAL database-generated ID
          await tx.insert(inventoryTransactionsTable).values({
            inventoryId: newInventory.id,
            productId: product.productId,
            storeId,
            userId: userId,
            transactionType: "purchase",
            quantityBefore: 0,
            quantityAfter: product.quantity,
            transactionDate: new Date(),
            notes: `New stock added: ${product.quantity} units for lot ${
              product.lotNumber
            }. ${notes || ""}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          backorderFulfillmentCandidates.push({
            productId: product.productId,
            storeId,
            inventoryId: newInventory.id,
          });
        }
      }

      // Trigger backorder fulfillment with ACTUAL IDs
      await Promise.all(
        backorderFulfillmentCandidates.map((candidate) =>
          fulfillBackorders(
            candidate.productId,
            candidate.storeId,
            candidate.inventoryId,
            userId,
            tx
          )
        )
      );

      return { success: true };
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/inventory-stocks");
    revalidatePath("/inventory/inventory-adjustment-list");
    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error adding inventory stock:", error);
    throw error;
  }
};

// --- adjustInventoryStock Function ---
export const adjustInventoryStock = async (
  data: ExistingStockAdjustmentFormValues,
  userId: string
) => {
  try {
    const { storeId, entries, notes } = data;

    const result = await db.transaction(async (tx) => {
      const backorderFulfillmentCandidates: {
        productId: string;
        storeId: string;
        inventoryId: string;
      }[] = [];

      const inventoryIdsToFetch = entries.map(
        (entry) => entry.inventoryStockId
      );
      if (inventoryIdsToFetch.length === 0) {
        return { success: true };
      }

      const existingInventories = await tx
        .select()
        .from(inventoryTable)
        .where(
          and(
            eq(inventoryTable.storeId, storeId),
            eq(inventoryTable.isActive, true),
            inArray(inventoryTable.id, inventoryIdsToFetch)
          )
        );

      const existingInventoryMap = new Map<
        string,
        typeof inventoryTable.$inferSelect
      >();
      existingInventories.forEach((inv) =>
        existingInventoryMap.set(inv.id, inv)
      );

      for (const entry of entries) {
        const existingInventory = existingInventoryMap.get(
          entry.inventoryStockId
        );

        if (!existingInventory) {
          throw new Error(
            `Inventory stock not found for ID: ${entry.inventoryStockId} or is inactive.`
          );
        }

        const oldQuantity = existingInventory.quantity;
        let newQuantity = oldQuantity;
        let adjustmentNote = "";

        if (entry.adjustmentType === "ADD") {
          newQuantity += entry.adjustmentQuantity;
          adjustmentNote = `Added ${entry.adjustmentQuantity} units`;

          backorderFulfillmentCandidates.push({
            productId: existingInventory.productId,
            storeId: storeId,
            inventoryId: existingInventory.id,
          });
        } else {
          if (entry.adjustmentQuantity > oldQuantity) {
            throw new Error(
              `Cannot subtract ${entry.adjustmentQuantity} units. Only ${oldQuantity} units available for lot ${existingInventory.lotNumber}.`
            );
          }
          newQuantity -= entry.adjustmentQuantity;
          adjustmentNote = `Subtracted ${entry.adjustmentQuantity} units`;

          await revertBackorderFulfillment(
            tx,
            existingInventory.id,
            entry.adjustmentQuantity,
            userId
          );
        }

        await tx
          .update(inventoryTable)
          .set({
            quantity: newQuantity,
            isActive: newQuantity > 0,
            updatedAt: new Date(),
          })
          .where(eq(inventoryTable.id, existingInventory.id));

        await tx.insert(inventoryTransactionsTable).values({
          inventoryId: existingInventory.id,
          productId: existingInventory.productId,
          storeId,
          userId: userId,
          transactionType: "adjustment",
          quantityBefore: oldQuantity,
          quantityAfter: newQuantity,
          transactionDate: new Date(),
          notes: `${adjustmentNote} | ${notes || "No additional notes"}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await Promise.all(
        backorderFulfillmentCandidates.map((candidate) =>
          fulfillBackorders(
            candidate.productId,
            candidate.storeId,
            candidate.inventoryId,
            userId,
            tx
          )
        )
      );

      return { success: true };
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/inventory-stocks");
    revalidatePath("/inventory/inventory-adjustment-list");
    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error adjusting inventory stock:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to adjust inventory stock"
    );
  }
};

// --- getInventoryStock Function ---
export const getInventoryStock = async (
  page: number = 0,
  limit: number = 10,
  getAllInventoryStock: boolean = false,
  filters?: InventoryStockFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      let query = tx
        .select({
          inventory: inventoryTable,
          product: productsTable,
          store: storesTable,
        })
        .from(inventoryTable)
        .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
        .leftJoin(storesTable, eq(inventoryTable.storeId, storesTable.id))
        .$dynamic();

      // Apply filters
      const conditions = buildStockFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(inventoryTable.createdAt));

      // Apply pagination
      if (!getAllInventoryStock && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const inventoryStock = await query;

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(inventoryTable)
        .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
        .leftJoin(storesTable, eq(inventoryTable.storeId, storesTable.id))
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllInventoryStock
        ? inventoryStock.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: inventoryStock,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting inventory stock:", error);
    throw error;
  }
};

// --- getInventoryStockById Function ---
export const getInventoryStockById = async (inventoryId: string) => {
  try {
    const inventoryStock = await db
      .select({
        inventory: inventoryTable,
        product: productsTable,
        store: storesTable,
      })
      .from(inventoryTable)
      .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
      .leftJoin(storesTable, eq(inventoryTable.storeId, storesTable.id))
      .where(eq(inventoryTable.id, inventoryId))
      .then((res) => res[0]);

    return parseStringify(inventoryStock);
  } catch (error) {
    console.error("Error getting inventory stock by ID:", error);
    throw error;
  }
};

// --- getInventoryTransactions Function ---
export const getInventoryTransactions = async (
  page: number = 0,
  limit: number = 10,
  getAllTransactions: boolean = false,
  filters?: InventoryTransactionsFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      let query = tx
        .select({
          transaction: inventoryTransactionsTable,
          inventory: inventoryTable,
          product: productsTable,
          store: storesTable,
          user: usersTable,
        })
        .from(inventoryTransactionsTable)
        .leftJoin(
          inventoryTable,
          eq(inventoryTransactionsTable.inventoryId, inventoryTable.id)
        )
        .leftJoin(
          productsTable,
          eq(inventoryTransactionsTable.productId, productsTable.id)
        )
        .leftJoin(
          storesTable,
          eq(inventoryTransactionsTable.storeId, storesTable.id)
        )
        .leftJoin(
          usersTable,
          eq(inventoryTransactionsTable.userId, usersTable.id)
        )
        .$dynamic();

      // Apply filters
      const conditions = buildTransactionsFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(inventoryTransactionsTable.transactionDate));

      // Apply pagination
      if (!getAllTransactions && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const transactions = await query;

      // 2. Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(inventoryTransactionsTable)
        .leftJoin(
          inventoryTable,
          eq(inventoryTransactionsTable.inventoryId, inventoryTable.id)
        )
        .leftJoin(
          productsTable,
          eq(inventoryTransactionsTable.productId, productsTable.id)
        )
        .leftJoin(
          storesTable,
          eq(inventoryTransactionsTable.storeId, storesTable.id)
        )
        .leftJoin(
          usersTable,
          eq(inventoryTransactionsTable.userId, usersTable.id)
        )
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllTransactions
        ? transactions.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: transactions,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting inventory transactions:", error);
    throw error;
  }
};
