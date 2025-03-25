"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { UnitFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { unitsTable } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Add Unit
export const addUnit = async (unitData: UnitFormValues) => {
  try {
    const insertedUnit = await db
      .insert(unitsTable)
      .values(unitData)
      .returning();

    revalidatePath("/settings/units");
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
  getAllUnits: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(unitsTable)
      .where(eq(unitsTable.isActive, true))
      .orderBy(desc(unitsTable.createdAt));

    if (!getAllUnits) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const units = await query;

    // For getAllUnits, fetch all units in batches (if needed)
    if (getAllUnits) {
      let allUnits: typeof units = [];
      let offset = 0;
      const batchSize = 100;

      while (true) {
        const batch = await db
          .select()
          .from(unitsTable)
          .where(eq(unitsTable.isActive, true))
          .orderBy(desc(unitsTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allUnits = [...allUnits, ...batch];

        // If we got fewer units than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allUnits),
        total: allUnits.length,
      };
    }

    // For paginated results
    const total = await db
      .select()
      .from(unitsTable)
      .where(eq(unitsTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(units),
      total,
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
    return parseStringify(updatedUnit);
  } catch (error) {
    console.error("Error soft deleting unit:", error);
    throw error;
  }
};
