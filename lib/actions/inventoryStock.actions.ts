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
import { eq, and, desc, sql, gte, lte, asc, gt, ilike, or } from "drizzle-orm";
import { ExistingStockAdjustmentFormValues } from "../validation";
import { ExtendedStockAdjustmentFormValues } from "@/components/forms/NewStockForm";
import { InventoryStockFilters } from "@/hooks/useInventoryStock";
import { InventoryStock, InventoryTransactionType } from "@/types";
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

    const newInventory: InventoryStock = await tx
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.id, newInventoryId))
      .then((res: InventoryStock[]) => res[0]);

    if (!newInventory) {
      throw new Error("New inventory not found");
    }

    let remainingQty = newInventory.quantity;

    for (const backorder of pendingBackorders) {
      if (remainingQty <= 0) {
        console.log("No remaining quantity to fulfill additional backorders");
        break;
      }

      const fulfillQty = Math.min(remainingQty, backorder.pendingQuantity);

      // Create fulfillment record
      await tx.insert(backorderFulfillmentsTable).values({
        backorderId: backorder.id,
        inventoryId: newInventoryId,
        fulfilledQuantity: fulfillQty,
      });

      // Update sale item with actual inventory
      await tx.insert(saleItemInventoryTable).values({
        saleItemId: backorder.saleItemId,
        inventoryStockId: newInventoryId,
        lotNumber: newInventory.lotNumber,
        quantityToTake: fulfillQty,
      });

      // Update backorder status
      const newPending = backorder.pendingQuantity - fulfillQty;
      if (newPending > 0) {
        await tx
          .update(backordersTable)
          .set({
            pendingQuantity: newPending,
          })
          .where(eq(backordersTable.id, backorder.id));

        await tx
          .update(saleItemsTable)
          .set({
            backorderQuantity: sql`${saleItemsTable.backorderQuantity} - ${fulfillQty}`,
          })
          .where(eq(saleItemsTable.id, backorder.saleItemId));
      } else {
        await tx
          .update(saleItemsTable)
          .set({
            backorderQuantity: 0,
            hasBackorder: false,
          })
          .where(eq(saleItemsTable.id, backorder.saleItemId));

        await tx
          .update(backordersTable)
          .set({
            isActive: false,
          })
          .where(eq(backordersTable.id, backorder.id));
      }

      // Update inventory quantity
      remainingQty -= fulfillQty;
      await tx
        .update(inventoryTable)
        .set({
          quantity: remainingQty,
        })
        .where(eq(inventoryTable.id, newInventoryId));

      // Log transaction for backorder fulfillment
      await tx.insert(inventoryTransactionsTable).values({
        inventoryId: newInventoryId,
        productId: productId,
        storeId: storeId,
        userId: userId,
        transactionType: "backorder_fulfillment",
        quantityBefore: newInventory.quantity,
        quantityAfter: remainingQty,
        transactionDate: new Date(),
        referenceId: backorder.saleItemId,
        notes: `Fulfilled backorder for sale item ${backorder.saleItemId}`,
      });
    }
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

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      const inventoryItems = [];
      const transactions = [];

      // Process each product
      for (const product of products) {
        // Add or update inventory record
        const existingInventory = await tx
          .select()
          .from(inventoryTable)
          .where(
            and(
              eq(inventoryTable.productId, product.productId),
              eq(inventoryTable.storeId, storeId),
              eq(inventoryTable.lotNumber, product.lotNumber),
              eq(inventoryTable.isActive, true)
            )
          )
          .then((res) => res[0]);

        if (existingInventory) {
          // Update existing inventory
          const [updatedInventory] = await tx
            .update(inventoryTable)
            .set({
              quantity: existingInventory.quantity + product.quantity,
              costPrice: product.costPrice,
              sellingPrice: product.sellingPrice,
              manufactureDate: product.manufactureDate,
              expiryDate: product.expiryDate,
              updatedAt: new Date(),
            })
            .where(eq(inventoryTable.id, existingInventory.id))
            .returning();

          inventoryItems.push(updatedInventory);

          // Log transaction (update)
          const transaction = await tx
            .insert(inventoryTransactionsTable)
            .values({
              inventoryId: existingInventory.id,
              productId: product.productId,
              storeId,
              userId: userId,
              transactionType: "adjustment",
              quantityBefore: existingInventory.quantity,
              quantityAfter: existingInventory.quantity + product.quantity,
              transactionDate: new Date(),
              notes: `Stock adjustment: Added ${product.quantity} units \n ${notes}`,
            })
            .returning();

          transactions.push(transaction[0]);
        } else {
          // Create new inventory record
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
            })
            .returning();

          inventoryItems.push(newInventory);

          // Log transaction (new)
          const transaction = await tx
            .insert(inventoryTransactionsTable)
            .values({
              inventoryId: newInventory.id,
              productId: product.productId,
              storeId,
              userId: userId,
              transactionType: "adjustment",
              quantityBefore: 0,
              quantityAfter: product.quantity,
              transactionDate: new Date(),
              notes: `New stock added: ${product.quantity} units \n ${notes}`,
            })
            .returning();

          transactions.push(transaction[0]);

          // Fulfill Backorders for new inventory
          fulfillBackorders(
            newInventory.productId,
            newInventory.storeId,
            newInventory.id,
            userId,
            tx
          );
        }
      }

      return { inventoryItems, transactions };
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
      const inventoryItems = [];
      const transactions = [];

      // Process each adjustment entry
      for (const entry of entries) {
        // Get the existing inventory record
        const existingInventory = await tx
          .select()
          .from(inventoryTable)
          .where(
            and(
              eq(inventoryTable.id, entry.inventoryStockId),
              eq(inventoryTable.isActive, true)
            )
          )
          .then((res) => res[0]);

        if (!existingInventory) {
          throw new Error(
            `Inventory stock not found for ID: ${entry.inventoryStockId}`
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

        // Update inventory record
        const updatedInventory = await tx
          .update(inventoryTable)
          .set({
            quantity: newQuantity,
            updatedAt: new Date(),
          })
          .where(eq(inventoryTable.id, existingInventory.id))
          .returning();

        inventoryItems.push(updatedInventory[0]);

        // Log transaction
        const transaction = await tx
          .insert(inventoryTransactionsTable)
          .values({
            inventoryId: existingInventory.id,
            productId: existingInventory.productId,
            storeId,
            userId: userId,
            transactionType: "adjustment",
            quantityBefore: existingInventory.quantity,
            quantityAfter: newQuantity,
            transactionDate: new Date(),
            notes: `${adjustmentNote} | ${notes || "No additional notes"}`,
          })
          .returning();

        transactions.push(transaction[0]);
      }

      return { inventoryItems, transactions };
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
