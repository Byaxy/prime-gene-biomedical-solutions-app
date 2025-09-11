"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { UnitFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { unitsTable } from "@/drizzle/schema";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { UnitFilters } from "@/hooks/useUnits";

const buildFilterConditions = (filters: UnitFilters) => {
  const conditions = [];

  conditions.push(eq(unitsTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(unitsTable.name, searchTerm),
        ilike(unitsTable.description, searchTerm),
        ilike(unitsTable.code, searchTerm)
      )
    );
  }

  return conditions;
};

// Add Unit
export const addUnit = async (unitData: UnitFormValues) => {
  try {
    const insertedUnit = await db
      .insert(unitsTable)
      .values(unitData)
      .returning();

    revalidatePath("/settings/units");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(insertedUnit);
  } catch (error) {
    console.error("Error adding unit:", error);
    throw error;
  }
};

// Get Unit By ID
export const getUnitById = async (unitId: string) => {
  try {
    const response = await db
      .select()
      .from(unitsTable)
      .where(eq(unitsTable.id, unitId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting unit by ID:", error);
    throw error;
  }
};

// Get Units
export const getUnits = async (
  page: number = 0,
  limit: number = 10,
  getAllUnits: boolean = false,
  filters?: UnitFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Build the main query
      let query = tx.select().from(unitsTable).$dynamic();

      const conditions = buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(unitsTable.createdAt));

      if (!getAllUnits && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const units = await query;

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(unitsTable)
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllUnits
        ? units.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: units,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting units:", error);
    throw error;
  }
};

// Edit Unit
export const editUnit = async (unitData: UnitFormValues, unitId: string) => {
  try {
    const updatedUnit = await db
      .update(unitsTable)
      .set(unitData)
      .where(eq(unitsTable.id, unitId))
      .returning();

    revalidatePath("/products/units");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(updatedUnit);
  } catch (error) {
    console.error("Error editing unit:", error);
    throw error;
  }
};

// Permanently Delete Unit
export const deleteUnit = async (unitId: string) => {
  try {
    const deletedUnit = await db
      .delete(unitsTable)
      .where(eq(unitsTable.id, unitId))
      .returning();

    revalidatePath("/products/units");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(deletedUnit);
  } catch (error) {
    console.error("Error deleting unit:", error);
    throw error;
  }
};

// Soft Delete Unit
export const softDeleteUnit = async (unitId: string) => {
  try {
    const updatedUnit = await db
      .update(unitsTable)
      .set({ isActive: false })
      .where(eq(unitsTable.id, unitId))
      .returning();

    revalidatePath("/products/units");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(updatedUnit);
  } catch (error) {
    console.error("Error soft deleting unit:", error);
    throw error;
  }
};
