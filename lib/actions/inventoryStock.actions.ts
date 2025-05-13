"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import {
  inventoryTable,
  inventoryTransactionsTable,
  productsTable,
  storesTable,
  usersTable,
} from "@/drizzle/schema";
import { eq, and, desc, sql, gte, lte, asc } from "drizzle-orm";
import { ExistingStockAdjustmentFormValues } from "../validation";
import { ExtendedStockAdjustmentFormValues } from "@/components/forms/NewStockForm";

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
          const updatedInventory = await tx
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

          inventoryItems.push(updatedInventory[0]);

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

          // Get the product
          const currentProduct = await tx
            .select()
            .from(productsTable)
            .where(eq(productsTable.id, product.productId))
            .then((res) => res[0]);

          await tx
            .update(productsTable)
            .set({ quantity: currentProduct.quantity + product.quantity })
            .where(eq(productsTable.id, product.productId));
        } else {
          // Create new inventory record
          const newInventory = await tx
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

          inventoryItems.push(newInventory[0]);

          // Log transaction (new)
          const transaction = await tx
            .insert(inventoryTransactionsTable)
            .values({
              inventoryId: newInventory[0].id,
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

          // Get the product
          const currentProduct = await tx
            .select()
            .from(productsTable)
            .where(eq(productsTable.id, product.productId))
            .then((res) => res[0]);

          await tx
            .update(productsTable)
            .set({ quantity: currentProduct.quantity + product.quantity })
            .where(eq(productsTable.id, product.productId));
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

        // Update product total quantity
        const currentProduct = await tx
          .select()
          .from(productsTable)
          .where(eq(productsTable.id, existingInventory.productId))
          .then((res) => res[0]);

        if (!currentProduct) {
          throw new Error(
            `Product not found for ID: ${existingInventory.productId}`
          );
        }

        let newProductQuantity = currentProduct.quantity;
        if (entry.adjustmentType === "ADD") {
          newProductQuantity += entry.adjustmentQuantity;
        } else {
          newProductQuantity -= entry.adjustmentQuantity;
        }

        await tx
          .update(productsTable)
          .set({
            quantity: newProductQuantity,
            updatedAt: new Date(),
          })
          .where(eq(productsTable.id, existingInventory.productId));
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
  filters?: {
    quantity_min?: number;
    quantity_max?: number;
    costPrice_min?: number;
    costPrice_max?: number;
    sellingPrice_min?: number;
    sellingPrice_max?: number;
    expiryDate_start?: string;
    expiryDate_end?: string;
    manufactureDate_start?: string;
    manufactureDate_end?: string;
    store?: string;
  }
) => {
  try {
    let query = db
      .select({
        inventory: inventoryTable,
        product: productsTable,
        store: storesTable,
      })
      .from(inventoryTable)
      .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
      .leftJoin(storesTable, eq(inventoryTable.storeId, storesTable.id))
      .$dynamic();

    // Create conditions array
    const conditions = [eq(inventoryTable.isActive, true)];

    // Apply filters if provided
    if (filters) {
      // Quantity range
      if (filters.quantity_min !== undefined) {
        conditions.push(gte(inventoryTable.quantity, filters.quantity_min));
      }
      if (filters.quantity_max !== undefined) {
        conditions.push(lte(inventoryTable.quantity, filters.quantity_max));
      }

      // Cost price range
      if (filters.costPrice_min !== undefined) {
        conditions.push(gte(inventoryTable.costPrice, filters.costPrice_min));
      }
      if (filters.costPrice_max !== undefined) {
        conditions.push(lte(inventoryTable.costPrice, filters.costPrice_max));
      }

      // Selling price range
      if (filters.sellingPrice_min !== undefined) {
        conditions.push(
          gte(inventoryTable.sellingPrice, filters.sellingPrice_min)
        );
      }
      if (filters.sellingPrice_max !== undefined) {
        conditions.push(
          lte(inventoryTable.sellingPrice, filters.sellingPrice_max)
        );
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
          lte(
            inventoryTable.manufactureDate,
            new Date(filters.manufactureDate_end)
          )
        );
      }

      // Store filter
      if (filters.store) {
        conditions.push(eq(storesTable.id, filters.store));
      }
    }

    // Apply where conditions
    query = query.where(and(...conditions));

    // Apply order by
    query = query.orderBy(desc(inventoryTable.createdAt));

    if (!getAllInventoryStock) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const inventoryStock = await query;

    // For getAllInventoryStock, fetch all in batches
    if (getAllInventoryStock) {
      let allInventoryStock: typeof inventoryStock = [];
      let offset = 0;
      const batchSize = 100;

      while (true) {
        const batch = await db
          .select({
            inventory: inventoryTable,
            product: productsTable,
            store: storesTable,
          })
          .from(inventoryTable)
          .leftJoin(
            productsTable,
            eq(inventoryTable.productId, productsTable.id)
          )
          .leftJoin(storesTable, eq(inventoryTable.storeId, storesTable.id))
          .where(eq(inventoryTable.isActive, true))
          .orderBy(asc(inventoryTable.expiryDate))
          .limit(batchSize)
          .offset(offset);

        allInventoryStock = [...allInventoryStock, ...batch];

        if (batch.length < batchSize) break;
        offset += batchSize;
      }

      return {
        documents: parseStringify(allInventoryStock),
        total: allInventoryStock.length,
      };
    }

    // For paginated results
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryTable)
      .where(eq(inventoryTable.isActive, true))
      .then((res) => res[0]?.count || 0);

    return {
      documents: parseStringify(inventoryStock),
      total,
    };
  } catch (error) {
    console.error("Error getting expenses:", error);
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
  filters?: {
    productId?: string;
    storeId?: string;
    transactionType?: string;
    startDate?: Date;
    endDate?: Date;
  }
) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
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
      .orderBy(desc(inventoryTransactionsTable.transactionDate));

    // Apply filters if provided
    if (filters) {
      const conditions = [];
      if (filters.productId) {
        conditions.push(
          eq(inventoryTransactionsTable.productId, filters.productId)
        );
      }
      if (filters.storeId) {
        conditions.push(
          eq(inventoryTransactionsTable.storeId, filters.storeId)
        );
      }
      if (filters.transactionType) {
        conditions.push(
          eq(
            inventoryTransactionsTable.transactionType,
            filters.transactionType as
              | "purchase"
              | "sale"
              | "transfer"
              | "adjustment"
          )
        );
      }
      if (filters.startDate && filters.endDate) {
        conditions.push(
          and(
            gte(inventoryTransactionsTable.transactionDate, filters.startDate),
            lte(inventoryTransactionsTable.transactionDate, filters.endDate)
          )
        );
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }

    if (!getAllTransactions) {
      query = query.limit(Number(limit)).offset(Number(page) * Number(limit));
    }

    const transactions = await query;

    // For paginated results
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryTransactionsTable)
      .then((res) => res[0]?.count || 0);

    return {
      documents: parseStringify(transactions),
      total,
    };
  } catch (error) {
    console.error("Error getting inventory transactions:", error);
    throw error;
  }
};
