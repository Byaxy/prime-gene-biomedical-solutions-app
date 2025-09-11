"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { TypeFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { productTypesTable } from "@/drizzle/schema";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { TypeFilters } from "@/hooks/useTypes";

const buildFilterConditions = (filters: TypeFilters) => {
  const conditions = [];

  conditions.push(eq(productTypesTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(productTypesTable.name, searchTerm),
        ilike(productTypesTable.description, searchTerm)
      )
    );
  }

  return conditions;
};

// Add Type
export const addType = async (typeData: TypeFormValues) => {
  try {
    const insertedType = await db
      .insert(productTypesTable)
      .values(typeData)
      .returning();

    revalidatePath("/settings/types");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(insertedType);
  } catch (error) {
    console.error("Error adding type:", error);
    throw error;
  }
};

// Get Type By Id
export const getTypeById = async (typeId: string) => {
  try {
    const response = await db
      .select()
      .from(productTypesTable)
      .where(eq(productTypesTable.id, typeId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting product type by ID:", error);
    throw error;
  }
};

// Get Types
export const getTypes = async (
  page: number = 0,
  limit: number = 10,
  getAllTypes: boolean = false,
  filters?: TypeFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Build the main query
      let query = tx.select().from(productTypesTable).$dynamic();

      const conditions = buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(productTypesTable.createdAt));

      if (!getAllTypes && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const types = await query;

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(productTypesTable)
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllTypes
        ? types.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: types,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting types:", error);
    throw error;
  }
};

// Edit Type
export const editType = async (typeData: TypeFormValues, typeId: string) => {
  try {
    const updatedType = await db
      .update(productTypesTable)
      .set(typeData)
      .where(eq(productTypesTable.id, typeId))
      .returning();

    revalidatePath("/settings/types");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(updatedType);
  } catch (error) {
    console.error("Error editing type:", error);
    throw error;
  }
};

// Permanently Delete Type
export const deleteType = async (typeId: string) => {
  try {
    const deletedType = await db
      .delete(productTypesTable)
      .where(eq(productTypesTable.id, typeId))
      .returning();

    revalidatePath("/settings/types");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(deletedType);
  } catch (error) {
    console.error("Error deleting type:", error);
    throw error;
  }
};

// Soft Delete Type
export const softDeleteType = async (typeId: string) => {
  try {
    const updatedType = await db
      .update(productTypesTable)
      .set({ isActive: false })
      .where(eq(productTypesTable.id, typeId))
      .returning();

    revalidatePath("/settings/types");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(updatedType);
  } catch (error) {
    console.error("Error soft deleting type:", error);
    throw error;
  }
};
