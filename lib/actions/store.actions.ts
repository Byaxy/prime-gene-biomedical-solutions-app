"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { StoreFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { storesTable } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Add Store
export const addStore = async (storeData: StoreFormValues) => {
  try {
    const insertedStore = await db
      .insert(storesTable)
      .values(storeData)
      .returning();

    revalidatePath("/settings/stores");
    return parseStringify(insertedStore);
  } catch (error) {
    console.error("Error adding store:", error);
    throw error;
  }
};

// Get Store By ID
export const getStoreById = async (storeId: string) => {
  try {
    const response = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.id, storeId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting store by ID:", error);
    throw error;
  }
};

// Get Stores
export const getStores = async (
  page: number = 0,
  limit: number = 10,
  getAllStores: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(storesTable)
      .where(eq(storesTable.isActive, true))
      .orderBy(desc(storesTable.createdAt));

    if (!getAllStores) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const stores = await query;

    // For getAllStores, fetch all stores in batches (if needed)
    if (getAllStores) {
      let allStores: typeof stores = [];
      let offset = 0;
      const batchSize = 100;

      while (true) {
        const batch = await db
          .select()
          .from(storesTable)
          .where(eq(storesTable.isActive, true))
          .orderBy(desc(storesTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allStores = [...allStores, ...batch];

        // If we got fewer stores than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allStores),
        total: allStores.length,
      };
    }

    // For paginated results
    const total = await db
      .select()
      .from(storesTable)
      .where(eq(storesTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(stores),
      total,
    };
  } catch (error) {
    console.error("Error getting stores:", error);
    throw error;
  }
};

// Edit Store
export const editStore = async (
  storeData: StoreFormValues,
  storeId: string
) => {
  try {
    const updatedStore = await db
      .update(storesTable)
      .set(storeData)
      .where(eq(storesTable.id, storeId))
      .returning();

    revalidatePath("/products/stores");
    return parseStringify(updatedStore);
  } catch (error) {
    console.error("Error editing store:", error);
    throw error;
  }
};

// Permanently Delete Store
export const deleteStore = async (storeId: string) => {
  try {
    const deletedStore = await db
      .delete(storesTable)
      .where(eq(storesTable.id, storeId))
      .returning();

    revalidatePath("/products/stores");
    return parseStringify(deletedStore);
  } catch (error) {
    console.error("Error deleting store:", error);
    throw error;
  }
};

// Soft Delete Store
export const softDeleteStore = async (storeId: string) => {
  try {
    const updatedStore = await db
      .update(storesTable)
      .set({ isActive: false })
      .where(eq(storesTable.id, storeId))
      .returning();

    revalidatePath("/products/stores");
    return parseStringify(updatedStore);
  } catch (error) {
    console.error("Error soft deleting store:", error);
    throw error;
  }
};
