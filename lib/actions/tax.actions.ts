"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { TaxFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { taxRatesTable } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Add Tax
export const addTax = async (taxData: TaxFormValues) => {
  try {
    const insertedTax = await db
      .insert(taxRatesTable)
      .values(taxData)
      .returning();

    revalidatePath("/settings/taxes");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(insertedTax);
  } catch (error) {
    console.error("Error adding tax:", error);
    throw error;
  }
};

// Get Tax By ID
export const getTaxById = async (taxId: string) => {
  try {
    const response = await db
      .select()
      .from(taxRatesTable)
      .where(eq(taxRatesTable.id, taxId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting tax by ID:", error);
    throw error;
  }
};

// Get Taxs
export const getTaxes = async (
  page: number = 0,
  limit: number = 10,
  getAllTaxes: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(taxRatesTable)
      .where(eq(taxRatesTable.isActive, true))
      .orderBy(desc(taxRatesTable.createdAt));

    if (!getAllTaxes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const taxes = await query;

    // For getAllTaxs, fetch all taxs in batches (if needed)
    if (getAllTaxes) {
      let allTaxes: typeof taxes = [];
      let offset = 0;
      const batchSize = 100;

      while (true) {
        const batch = await db
          .select()
          .from(taxRatesTable)
          .where(eq(taxRatesTable.isActive, true))
          .orderBy(desc(taxRatesTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allTaxes = [...allTaxes, ...batch];

        // If we got fewer taxes than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allTaxes),
        total: allTaxes.length,
      };
    }

    // For paginated results
    const total = await db
      .select()
      .from(taxRatesTable)
      .where(eq(taxRatesTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(taxes),
      total,
    };
  } catch (error) {
    console.error("Error getting taxs:", error);
    throw error;
  }
};

// Edit Tax
export const editTax = async (taxData: TaxFormValues, taxId: string) => {
  try {
    const updatedTax = await db
      .update(taxRatesTable)
      .set(taxData)
      .where(eq(taxRatesTable.id, taxId))
      .returning();

    revalidatePath("/settings/taxes");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(updatedTax);
  } catch (error) {
    console.error("Error editing tax:", error);
    throw error;
  }
};

// Permanently Delete Tax
export const deleteTax = async (taxId: string) => {
  try {
    const deletedTax = await db
      .delete(taxRatesTable)
      .where(eq(taxRatesTable.id, taxId))
      .returning();

    revalidatePath("/settings/taxes");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(deletedTax);
  } catch (error) {
    console.error("Error deleting tax:", error);
    throw error;
  }
};

// Soft Delete Tax
export const softDeleteTax = async (taxId: string) => {
  try {
    const updatedTax = await db
      .update(taxRatesTable)
      .set({ isActive: false })
      .where(eq(taxRatesTable.id, taxId))
      .returning();

    revalidatePath("/settings/taxes");
    revalidatePath("/inventory/add-inventory");
    return parseStringify(updatedTax);
  } catch (error) {
    console.error("Error soft deleting tax:", error);
    throw error;
  }
};
