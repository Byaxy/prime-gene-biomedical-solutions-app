/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import {
  backorderFulfillmentsTable,
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
import { InventoryTransactionType } from "@/types";
import { InventoryTransactionsFilters } from "@/hooks/useInventoryStockTransactions";

const buildTransactionsFilterConditions = (
  filters: InventoryTransactionsFilters
) => {
  const conditions = [];

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
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

const buildStockFilterConditions = (filters: InventoryStockFilters) => {
  const conditions = [];

  conditions.push(eq(inventoryTable.isActive, true));
  conditions.push(gt(inventoryTable.quantity, 0));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
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

  // Quantity range
  if (filters.quantity_min) {
    conditions.push(gte(inventoryTable.quantity, filters.quantity_min));
  }
  if (filters.quantity_max) {
    conditions.push(lte(inventoryTable.quantity, filters.quantity_max));
  }

  // Cost price range
  if (filters.costPrice_min) {
    conditions.push(gte(inventoryTable.costPrice, filters.costPrice_min));
  }
  if (filters.costPrice_max) {
    conditions.push(lte(inventoryTable.costPrice, filters.costPrice_max));
  }

  // Selling price range
  if (filters.sellingPrice_min) {
    conditions.push(gte(inventoryTable.sellingPrice, filters.sellingPrice_min));
  }
  if (filters.sellingPrice_max) {
    conditions.push(lte(inventoryTable.sellingPrice, filters.sellingPrice_max));
  }

  // Expiry date range
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

  // Manufacture date range
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

  // Store filter
  if (filters.store) {
    conditions.push(eq(storesTable.id, filters.store));
  }

  return conditions;
};

// fulfill Backorders
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
      .orderBy(asc(backordersTable.createdAt));

    if (pendingBackorders.length === 0) {
      console.log(
        `No pending backorders found for product ${productId} in store ${storeId}`
      );
      return;
    }

    const [newInventory] = await tx
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, newInventoryId));

    if (!newInventory) {
      throw new Error("New inventory not found");
    }

    let remainingQty = newInventory.quantity;

    // Arrays to collect batch operations
    const backorderFulfillmentsToInsert: any[] = [];
    const saleItemInventoryToInsert: any[] = [];
    const inventoryTransactionsToInsert: any[] = [];

    // Arrays/Maps for batch updates
    const backorderUpdates: {
      id: string;
      pendingQuantity: number;
      isActive: boolean;
    }[] = [];

    // Map to keep track of total fulfilled quantity per sale item
    const saleItemFulfilledMap = new Map<
      string,
      { totalFulfilled: number; currentBackorderQty: number }
    >();
    for (const backorder of pendingBackorders) {
      saleItemFulfilledMap.set(backorder.saleItemId, {
        totalFulfilled: 0,
        currentBackorderQty: backorder.pendingQuantity,
      });
    }

    for (const backorder of pendingBackorders) {
      if (remainingQty <= 0) {
        console.log("No remaining quantity to fulfill additional backorders");
        break;
      }

      const fulfillQty = Math.min(remainingQty, backorder.pendingQuantity);

      // Collect fulfillment record
      backorderFulfillmentsToInsert.push({
        backorderId: backorder.id,
        inventoryId: newInventoryId,
        fulfilledQuantity: fulfillQty,
      });

      // Collect sale item inventory record
      saleItemInventoryToInsert.push({
        saleItemId: backorder.saleItemId,
        inventoryStockId: newInventoryId,
        lotNumber: newInventory.lotNumber,
        quantityToTake: fulfillQty,
      });

      // Update backorder and sale item status locally for batching
      const newPending = backorder.pendingQuantity - fulfillQty;
      const currentSaleItem = saleItemFulfilledMap.get(backorder.saleItemId);
      if (currentSaleItem) {
        currentSaleItem.totalFulfilled += fulfillQty;
        currentSaleItem.currentBackorderQty -= fulfillQty;
      }

      backorderUpdates.push({
        id: backorder.id,
        pendingQuantity: newPending,
        isActive: newPending <= 0 ? false : true,
      });

      // Log transaction data
      inventoryTransactionsToInsert.push({
        inventoryId: newInventoryId,
        productId: productId,
        storeId: storeId,
        userId: userId,
        transactionType: "backorder_fulfillment",
        quantityBefore: remainingQty,
        quantityAfter: remainingQty - fulfillQty,
        transactionDate: new Date(),
        referenceId: backorder.saleItemId,
        notes: `Fulfilled backorder for sale item ${backorder.saleItemId} with ${fulfillQty} units`,
      });

      remainingQty -= fulfillQty;
    }

    // --- Execute all batch operations ---

    if (backorderFulfillmentsToInsert.length > 0) {
      await tx
        .insert(backorderFulfillmentsTable)
        .values(backorderFulfillmentsToInsert);
    }
    if (saleItemInventoryToInsert.length > 0) {
      await tx.insert(saleItemInventoryTable).values(saleItemInventoryToInsert);
    }
    if (inventoryTransactionsToInsert.length > 0) {
      await tx
        .insert(inventoryTransactionsTable)
        .values(inventoryTransactionsToInsert);
    }

    // Batch update backorders
    await Promise.all(
      backorderUpdates.map((update) =>
        tx
          .update(backordersTable)
          .set({
            pendingQuantity: update.pendingQuantity,
            isActive: update.isActive,
          })
          .where(eq(backordersTable.id, update.id))
      )
    );

    const distinctSaleItemIds = Array.from(saleItemFulfilledMap.keys());
    await Promise.all(
      distinctSaleItemIds.map((saleItemId) => {
        const itemInfo = saleItemFulfilledMap.get(saleItemId);
        if (itemInfo) {
          const newBackorderQty = itemInfo.currentBackorderQty;
          const hasBackorder = newBackorderQty > 0;

          return tx
            .update(saleItemsTable)
            .set({
              backorderQuantity: newBackorderQty,
              hasBackorder: hasBackorder,
            })
            .where(eq(saleItemsTable.id, saleItemId));
        }
        return Promise.resolve();
      })
    );
  } catch (error) {
    console.error("Error in fulfillBackorders:", error);
    throw error;
  }
};

// Add new inventory stock
export const addInventoryStock = async (
  data: ExtendedStockAdjustmentFormValues,
  userId: string
) => {
  try {
    const { storeId, receivedDate, products, notes } = data;

    const result = await db.transaction(async (tx) => {
      const inventoryItemsToInsert: any[] = [];
      const inventoryUpdates: Promise<any>[] = [];
      const transactionsToInsert: any[] = [];
      const backorderFulfillmentCalls: Promise<void>[] = [];

      // First, get all existing inventories for the products in one go
      const productLotCombinations = products.map((p) => ({
        productId: p.productId,
        lotNumber: p.lotNumber,
      }));

      const existingInventories = await tx
        .select()
        .from(inventoryTable)
        .where(
          and(
            eq(inventoryTable.storeId, storeId),
            eq(inventoryTable.isActive, true),
            sql`${inventoryTable.productId} || ${
              inventoryTable.lotNumber
            } IN (${productLotCombinations
              .map((p) => `${p.productId}${p.lotNumber}`)
              .join(",")})`
          )
        );

      const existingInventoryMap = new Map<
        string,
        typeof inventoryTable.$inferSelect
      >();
      existingInventories.forEach((inv) =>
        existingInventoryMap.set(`${inv.productId}-${inv.lotNumber}`, inv)
      );

      for (const product of products) {
        const key = `${product.productId}-${product.lotNumber}`;
        const existingInventory = existingInventoryMap.get(key);

        if (existingInventory) {
          // Update existing inventory
          const newQuantity = existingInventory.quantity + product.quantity;
          inventoryUpdates.push(
            tx
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
              .where(eq(inventoryTable.id, existingInventory.id))
              .returning()
          );

          // Log transaction (update)
          transactionsToInsert.push({
            inventoryId: existingInventory.id,
            productId: product.productId,
            storeId,
            userId: userId,
            transactionType: "adjustment",
            quantityBefore: existingInventory.quantity,
            quantityAfter: newQuantity,
            transactionDate: new Date(),
            notes: `Stock adjustment: Added ${product.quantity} units \n ${notes}`,
          });
        } else {
          // Create new inventory record
          const newInventoryId = sql`gen_random_uuid()`;
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
          });

          // Log transaction (new)
          transactionsToInsert.push({
            inventoryId: newInventoryId,
            productId: product.productId,
            storeId,
            userId: userId,
            transactionType: "adjustment",
            quantityBefore: 0,
            quantityAfter: product.quantity,
            transactionDate: new Date(),
            notes: `New stock added: ${product.quantity} units \n ${notes}`,
          });

          backorderFulfillmentCalls.push(
            fulfillBackorders(
              product.productId,
              storeId,
              newInventoryId as unknown as string,
              userId,
              tx
            )
          );
        }
      }

      // --- Execute all batch operations ---

      // Perform all new inventory inserts
      let insertedInventoryRecords: any[] = [];
      if (inventoryItemsToInsert.length > 0) {
        insertedInventoryRecords = await tx
          .insert(inventoryTable)
          .values(inventoryItemsToInsert)
          .returning();
      }

      // Execute all pending inventory updates
      const updatedInventoryRecords = await Promise.all(inventoryUpdates);

      // Perform all transaction inserts
      let insertedTransactions: any[] = [];
      if (transactionsToInsert.length > 0) {
        insertedTransactions = await tx
          .insert(inventoryTransactionsTable)
          .values(transactionsToInsert)
          .returning();
      }

      // Execute all backorder fulfillments
      await Promise.all(backorderFulfillmentCalls);

      return {
        inventoryItems: [
          ...insertedInventoryRecords,
          ...updatedInventoryRecords.flat(),
        ],
        transactions: insertedTransactions,
      };
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/inventory-stocks");
    revalidatePath("/inventory/inventory-adjustment-list");
    return parseStringify(result);
  } catch (error) {
    console.error("Error adding inventory stock:", error);
    throw error;
  }
};

// Addjust inventory stock
export const adjustInventoryStock = async (
  data: ExistingStockAdjustmentFormValues,
  userId: string
) => {
  try {
    const { storeId, entries, notes } = data;

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      const updatedInventoryRecords: any[] = [];
      const transactionsToInsert: any[] = [];

      // Fetch all relevant existing inventories in one go
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
        // Get the existing inventory record from the map
        const existingInventory = existingInventoryMap.get(
          entry.inventoryStockId
        );

        if (!existingInventory) {
          throw new Error(
            `Inventory stock not found for ID: ${entry.inventoryStockId} or is inactive`
          );
        }

        // Calculate new quantity based on adjustment type
        let newQuantity = existingInventory.quantity;
        let adjustmentNote = "";

        if (entry.adjustmentType === "ADD") {
          newQuantity += entry.adjustmentQuantity;
          adjustmentNote = `Added ${entry.adjustmentQuantity} units`;
        } else {
          if (entry.adjustmentQuantity > existingInventory.quantity) {
            throw new Error(
              `Cannot subtract ${entry.adjustmentQuantity} from current quantity ${existingInventory.quantity}`
            );
          }
          newQuantity -= entry.adjustmentQuantity;
          adjustmentNote = `Subtracted ${entry.adjustmentQuantity} units`;
        }

        // Update inventory record (individual update due to varying newQuantity)
        const [updatedInventory] = await tx
          .update(inventoryTable)
          .set({
            quantity: newQuantity,
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
          quantityBefore: existingInventory.quantity,
          quantityAfter: newQuantity,
          transactionDate: new Date(),
          notes: `${adjustmentNote} | ${notes || "No additional notes"}`,
        });
      }

      // --- Execute batch operations ---

      // Perform all transaction inserts
      let insertedTransactions: any[] = [];
      if (transactionsToInsert.length > 0) {
        insertedTransactions = await tx
          .insert(inventoryTransactionsTable)
          .values(transactionsToInsert)
          .returning();
      }

      return {
        inventoryItems: updatedInventoryRecords,
        transactions: insertedTransactions,
      };
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/inventory-stocks");
    revalidatePath("/inventory/inventory-adjustment-list");
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

// Get inventory stock
export const getInventoryStock = async (
  page: number = 0,
  limit: number = 10,
  getAllInventoryStock: boolean = false,
  filters?: InventoryStockFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Build the main products query
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

      const conditions = buildStockFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(inventoryTable.createdAt));

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

// Get inventory stock by ID
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

// Get inventory transactions
export const getInventoryTransactions = async (
  page: number = 0,
  limit: number = 10,
  getAllTransactions: boolean = false,
  filters?: InventoryTransactionsFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Build the main products query
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

      const conditions = buildTransactionsFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(inventoryTransactionsTable.transactionDate));

      if (!getAllTransactions && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const transactions = await query;

      // Get total count for pagination
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
