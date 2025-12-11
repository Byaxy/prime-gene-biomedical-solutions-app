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
    // Lock pending backorders for this product/store (oldest first for FIFO fulfillment)
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
      .for(sql`FOR UPDATE`);

    if (pendingBackorders.length === 0) {
      console.log(
        `No pending backorders found for product ${productId} in store ${storeId}`
      );
      return;
    }

    // Lock the newly arrived/increased inventory record
    const [newInventory] = await tx
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, newInventoryId))
      .for(sql`FOR UPDATE`);

    if (
      !newInventory ||
      newInventory.isActive === false ||
      newInventory.quantity <= 0
    ) {
      console.warn(
        `Incoming inventory batch ${newInventoryId} not found, inactive, or has no quantity. Skipping backorder fulfillment.`
      );
      return;
    }

    let remainingQtyInNewBatch = newInventory.quantity;

    const saleItemInventoryToInsert: (typeof saleItemInventoryTable.$inferInsert)[] =
      [];
    const inventoryTransactionsToInsert: (typeof inventoryTransactionsTable.$inferInsert)[] =
      [];

    // Maps to aggregate updates for batching
    const backorderUpdates = new Map<
      string,
      {
        newPendingQuantity: number;
        productId: string;
        storeId: string;
        saleItemId: string;
      }
    >();
    const saleItemBackorderUpdates = new Map<string, number>();

    // Pre-fetch affected sale_items for locking
    const affectedSaleItemIds: string[] = [
      ...new Set(
        pendingBackorders.map((bo: SaleBackorder) => bo.saleItemId) as string[]
      ),
    ];
    const affectedSaleItems = await tx
      .select()
      .from(saleItemsTable)
      .where(inArray(saleItemsTable.id, affectedSaleItemIds))
      .for(sql`FOR UPDATE`);

    const affectedSaleItemsMap = new Map<string, SaleItem>(
      affectedSaleItems.map((si: SaleItem) => [si.id, si])
    );

    // Process pending backorders with the available incoming stock
    for (const backorder of pendingBackorders) {
      if (remainingQtyInNewBatch <= 0) {
        break;
      }

      const quantityToFulfillFromThisBatch = Math.min(
        remainingQtyInNewBatch,
        backorder.pendingQuantity
      );

      if (quantityToFulfillFromThisBatch > 0) {
        // Collect sale_item_inventory record: Links the new physical stock batch to the sale item.
        saleItemInventoryToInsert.push({
          saleItemId: backorder.saleItemId,
          inventoryStockId: newInventoryId,
          lotNumber: newInventory.lotNumber,
          quantityToTake: quantityToFulfillFromThisBatch,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Accumulate updates for this specific backorder record.
        backorderUpdates.set(backorder.id, {
          newPendingQuantity:
            backorder.pendingQuantity - quantityToFulfillFromThisBatch,
          productId: backorder.productId,
          storeId: backorder.storeId,
          saleItemId: backorder.saleItemId,
        });

        // Accumulate updates for sale_items.backorderQuantity.
        saleItemBackorderUpdates.set(
          backorder.saleItemId,
          (saleItemBackorderUpdates.get(backorder.saleItemId) || 0) +
            quantityToFulfillFromThisBatch
        );

        // Log transaction: Shows the backorder being provisioned by new inventory.
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
          notes: `Backorder for sale item ${backorder.saleItemId} provisioned with ${quantityToFulfillFromThisBatch} units from incoming stock (Lot: ${newInventory.lotNumber}).`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        remainingQtyInNewBatch -= quantityToFulfillFromThisBatch;
      }
    }

    // Execute batch updates for individual backorder records
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

    // Execute batch updates for sale_items.backorderQuantity and hasBackorder
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

    // Execute batch inserts for sale_item_inventory links and transactions
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
    console.error("Error in fulfillBackorders:", error);
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
    // Find all `saleItemInventory` links that point to this `affectedInventoryId`.
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
      .for(sql`FOR UPDATE`);

    if (linkedSaleItemInventories.length === 0) {
      console.log(
        `No active sale_item_inventory links found for inventory ${affectedInventoryId} to revert.`
      );
      return;
    }

    let remainingRevertQty = quantityToRevert;
    const backorderUpdates = new Map<
      string,
      {
        newPendingQuantity: number;
        newIsActive: boolean;
        productId: string;
        storeId: string;
        saleItemId: string;
      }
    >();
    const saleItemBackorderUpdates = new Map<string, number>();

    // Pre-fetch affected backorders and sale items for locking and initial state
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
      .for(sql`FOR UPDATE`);
    const affectedSaleItems = await tx
      .select()
      .from(saleItemsTable)
      .where(inArray(saleItemsTable.id, affectedSaleItemIds))
      .for(sql`FOR UPDATE`);

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

    // Process the linked sale_item_inventory records to reverse fulfillment
    for (const link of linkedSaleItemInventories) {
      if (remainingRevertQty <= 0) break;

      const saleItemId = link.saleItemId;
      const saleItem = saleItemMap.get(saleItemId);
      if (!saleItem) {
        console.warn(
          `Sale item ${saleItemId} not found during backorder reversal for link ${link.id}. Skipping.`
        );
        continue;
      }

      // How much from this specific link needs to be "un-linked"
      const revertAmountForLink = Math.min(
        remainingRevertQty,
        link.quantityToTake
      );

      if (revertAmountForLink > 0) {
        // Mark the sale_item_inventory link as inactive or reduce its quantityToTake
        await tx
          .update(saleItemInventoryTable)
          .set({
            quantityToTake: sql`${saleItemInventoryTable.quantityToTake} - ${revertAmountForLink}`,
            isActive: sql`${saleItemInventoryTable.quantityToTake} - ${revertAmountForLink} > 0`,
            updatedAt: new Date(),
          })
          .where(eq(saleItemInventoryTable.id, link.id));

        // Update corresponding backorder record: find one that was previously "fulfilled" (pending=0, isActive=false)
        // and re-increment its pendingQuantity. Priority: the one with matching productId and storeId.
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
          ); // Fallback to any matching one

        if (targetBackorder) {
          const currentBoUpdate = backorderUpdates.get(targetBackorder.id) || {
            newPendingQuantity: targetBackorder.pendingQuantity,
            productId: targetBackorder.productId,
            storeId: targetBackorder.storeId,
            saleItemId: targetBackorder.saleItemId,
            newIsActive: true,
          };
          currentBoUpdate.newPendingQuantity += revertAmountForLink;
          backorderUpdates.set(targetBackorder.id, currentBoUpdate);
        } else {
          // This is a critical edge case: a sale_item_inventory existed, but no matching backorder record
          // was found or it was already hard-deleted. We need to re-create a backorder if it truly should exist.
          console.warn(
            `No suitable backorder record found for sale item ${saleItemId} to revert fulfillment. Creating new backorder.`
          );
          const newBackorderId = crypto.randomUUID();
          await tx.insert(backordersTable).values({
            id: newBackorderId,
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

        // Accumulate update for sale_items.backorderQuantity
        saleItemBackorderUpdates.set(
          saleItemId,
          (saleItemBackorderUpdates.get(saleItemId) || 0) + revertAmountForLink
        );

        // Log transaction for backorder reinstatement
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
          notes: `Backorder for sale item ${saleItemId} reinstated by ${revertAmountForLink} units due to inventory adjustment/deletion of batch ${affectedInventoryId}.`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        remainingRevertQty -= revertAmountForLink;
      }
    }

    // Apply accumulated updates to backordersTable
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

    // Apply accumulated updates to sale_items.backorderQuantity and hasBackorder
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

    // Insert all accumulated inventory transactions
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
      const inventoryItemsToInsert: Array<typeof inventoryTable.$inferInsert> =
        [];
      const inventoryUpdates: {
        id: string;
        productId: string;
        newQuantity: number;
        oldQuantity: number;
      }[] = [];
      const transactionsToInsert: Array<
        typeof inventoryTransactionsTable.$inferInsert
      > = [];
      const backorderFulfillmentCandidates: {
        productId: string;
        storeId: string;
        newInventoryId: string;
      }[] = [];

      // 1. Fetch all existing inventories for the products in one go with locks
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

      // Create a more refined map that also considers lotNumber
      const existingInventoryMap = new Map<
        string,
        typeof inventoryTable.$inferSelect
      >();
      existingInventories.forEach((inv) =>
        existingInventoryMap.set(`${inv.productId}-${inv.lotNumber}`, inv)
      );

      // Process each product from the input
      for (const product of products) {
        const key = `${product.productId}-${product.lotNumber}`;
        const existingInventory = existingInventoryMap.get(key);

        if (existingInventory) {
          // Update existing inventory batch
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

          inventoryUpdates.push({
            id: existingInventory.id,
            productId: product.productId,
            newQuantity: newQuantity,
            oldQuantity: oldQuantity,
          });

          // Log transaction (update existing batch)
          transactionsToInsert.push({
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

          // This existing inventory batch now has more stock, so it can fulfill more backorders
          backorderFulfillmentCandidates.push({
            productId: product.productId,
            storeId,
            newInventoryId: existingInventory.id,
          });
        } else {
          // Create new inventory batch
          const newInventoryId = crypto.randomUUID();

          inventoryItemsToInsert.push({
            id: newInventoryId,
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
          });

          // Log transaction (new batch created)
          transactionsToInsert.push({
            inventoryId: newInventoryId,
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

          // This new inventory batch can fulfill backorders
          backorderFulfillmentCandidates.push({
            productId: product.productId,
            storeId,
            newInventoryId: newInventoryId,
          });
        }
      }

      // Execute all batch operations
      let insertedInventoryRecords: Array<typeof inventoryTable.$inferSelect> =
        [];
      if (inventoryItemsToInsert.length > 0) {
        insertedInventoryRecords = await tx
          .insert(inventoryTable)
          .values(inventoryItemsToInsert)
          .returning();
      }

      // Perform all transaction inserts (after inventories are guaranteed to exist/updated)
      if (transactionsToInsert.length > 0) {
        await tx
          .insert(inventoryTransactionsTable)
          .values(transactionsToInsert);
      }

      // Trigger backorder fulfillment for newly available inventory
      await Promise.all(
        backorderFulfillmentCandidates.map((candidate) =>
          fulfillBackorders(
            candidate.productId,
            candidate.storeId,
            candidate.newInventoryId,
            userId,
            tx
          )
        )
      );

      return {
        inventoryItems: [...insertedInventoryRecords],
        transactions: transactionsToInsert,
      };
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
      const updatedInventoryRecords: (typeof inventoryTable.$inferSelect)[] =
        [];
      const transactionsToInsert: (typeof inventoryTransactionsTable.$inferInsert)[] =
        [];
      const backorderFulfillmentCandidates: {
        productId: string;
        storeId: string;
        newInventoryId: string;
      }[] = [];

      // Fetch all relevant existing inventories in one go with locks
      const inventoryIdsToFetch = entries.map(
        (entry) => entry.inventoryStockId
      );
      if (inventoryIdsToFetch.length === 0) {
        return { inventoryItems: [], transactions: [] };
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

      // Process each adjustment entry
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

          // This inventory batch now has more stock, so it can fulfill more backorders
          backorderFulfillmentCandidates.push({
            productId: existingInventory.productId,
            storeId: storeId,
            newInventoryId: existingInventory.id,
          });
        } else {
          // entry.adjustmentType === "SUBTRACT"
          if (entry.adjustmentQuantity > oldQuantity) {
            throw new Error(
              `Cannot subtract ${entry.adjustmentQuantity} units. Only ${oldQuantity} units available for lot ${existingInventory.lotNumber}.`
            );
          }
          newQuantity -= entry.adjustmentQuantity;
          adjustmentNote = `Subtracted ${entry.adjustmentQuantity} units`;

          // CRITICAL: If stock is subtracted, we must revert backorder fulfillments
          // that might have been conceptually satisfied by this stock.
          await revertBackorderFulfillment(
            tx,
            existingInventory.id,
            entry.adjustmentQuantity,
            userId
          );
        }

        // Update inventory record (quantity and isActive if depleted)
        const [updatedInventory] = await tx
          .update(inventoryTable)
          .set({
            quantity: newQuantity,
            isActive: newQuantity > 0,
            updatedAt: new Date(),
          })
          .where(eq(inventoryTable.id, existingInventory.id))
          .returning();

        updatedInventoryRecords.push(updatedInventory);

        // Collect transaction for batch insert
        transactionsToInsert.push({
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

      // Execute batch operations
      if (transactionsToInsert.length > 0) {
        await tx
          .insert(inventoryTransactionsTable)
          .values(transactionsToInsert);
      }

      // 4. Trigger backorder fulfillment for any inventory increases
      await Promise.all(
        backorderFulfillmentCandidates.map((candidate) =>
          fulfillBackorders(
            candidate.productId,
            candidate.storeId,
            candidate.newInventoryId,
            userId,
            tx
          )
        )
      );

      return {
        inventoryItems: updatedInventoryRecords,
        transactions: transactionsToInsert,
      };
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
