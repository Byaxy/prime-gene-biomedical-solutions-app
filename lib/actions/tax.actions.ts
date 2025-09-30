"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { TaxFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { taxRatesTable } from "@/drizzle/schema";
import { eq, desc, or, ilike, and, sql } from "drizzle-orm";
import { TaxFilters } from "@/hooks/useTaxes";

const buildFilterConditions = (filters: TaxFilters) => {
  const conditions = [];

  conditions.push(eq(taxRatesTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(taxRatesTable.name, searchTerm),
        ilike(taxRatesTable.code, searchTerm),
        ilike(taxRatesTable.description, searchTerm)
      )
    );
  }

  return conditions;
};

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
  getAllTaxes: boolean = false,
  filters?: TaxFilters
) => {
  try {
    let query = db.select().from(taxRatesTable).$dynamic();

    const conditions = await buildFilterConditions(filters ?? {});

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(taxRatesTable.createdAt));

    if (!getAllTaxes && limit > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const taxes = await query;

    // Get total count for pagination
    let totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(taxRatesTable)
      .$dynamic();

    if (conditions.length > 0) {
      totalQuery = totalQuery.where(and(...conditions));
    }

    const total = taxes
      ? taxes.length
      : await totalQuery.then((res) => res[0]?.count || 0);

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
