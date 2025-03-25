"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { TypeFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { productTypesTable } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Add Type
export const addType = async (typeData: TypeFormValues) => {
  try {
    const insertedType = await db
      .insert(productTypesTable)
      .values(typeData)
      .returning();

    revalidatePath("/settings/types");
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
  getAllTypes: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(productTypesTable)
      .where(eq(productTypesTable.isActive, true))
      .orderBy(desc(productTypesTable.createdAt));

    if (!getAllTypes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const types = await query;

    // For getAllTypes, fetch all types in batches (if needed)
    if (getAllTypes) {
      let allTypes: typeof types = [];
      let offset = 0;
      const batchSize = 100; // Adjust batch size as needed

      while (true) {
        const batch = await db
          .select()
          .from(productTypesTable)
          .where(eq(productTypesTable.isActive, true))
          .orderBy(desc(productTypesTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allTypes = [...allTypes, ...batch];

        // If we got fewer types than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allTypes),
        total: allTypes.length,
      };
    }

    // For paginated results
    const total = await db
      .select()
      .from(productTypesTable)
      .where(eq(productTypesTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(types),
      total,
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
    return parseStringify(updatedType);
  } catch (error) {
    console.error("Error soft deleting type:", error);
    throw error;
  }
};
