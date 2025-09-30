"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { StoreFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { storesTable } from "@/drizzle/schema";
import { eq, desc, or, ilike, and, sql } from "drizzle-orm";
import { StoreFilters } from "@/hooks/useStores";

const buildFilterConditions = (filters: StoreFilters) => {
  const conditions = [];

  conditions.push(eq(storesTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(storesTable.name, searchTerm),
        ilike(storesTable.location, searchTerm)
      )
    );
  }

  return conditions;
};

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
  getAllStores: boolean = false,
  filters?: StoreFilters
) => {
  try {
    let query = db.select().from(storesTable).$dynamic();

    const conditions = await buildFilterConditions(filters ?? {});

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(storesTable.createdAt));

    if (!getAllStores && limit > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const stores = await query;

    // Get total count for pagination
    let totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(storesTable)
      .$dynamic();

    if (conditions.length > 0) {
      totalQuery = totalQuery.where(and(...conditions));
    }

    const total = stores
      ? stores.length
      : await totalQuery.then((res) => res[0]?.count || 0);

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
