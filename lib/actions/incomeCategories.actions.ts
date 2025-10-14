/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/drizzle/db";
import { IncomeCategoryFilters, IncomeCategoryFormValues } from "../validation";
import {
  chartOfAccountsTable,
  incomeCategoriesTable,
  paymentsReceivedTable,
} from "@/drizzle/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

const buildFilterConditions = (filters: IncomeCategoryFilters) => {
  const conditions = [];

  conditions.push(eq(incomeCategoriesTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(incomeCategoriesTable.name, searchTerm),
        ilike(incomeCategoriesTable.description, searchTerm),
        ilike(chartOfAccountsTable.accountName, searchTerm),
        ilike(chartOfAccountsTable.accountType, searchTerm)
      )
    );
  }

  if (filters.chartOfAccountsId) {
    conditions.push(
      eq(incomeCategoriesTable.chartOfAccountsId, filters.chartOfAccountsId)
    );
  }

  return conditions;
};

// Add a new Income Category
export const addIncomeCategory = async (values: IncomeCategoryFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Validate linked Chart of Accounts ID (must be 'revenue' type)
      const linkedCoA = await tx
        .select({
          id: chartOfAccountsTable.id,
          accountType: chartOfAccountsTable.accountType,
        })
        .from(chartOfAccountsTable)
        .where(eq(chartOfAccountsTable.id, values.chartOfAccountsId));
      if (linkedCoA.length === 0 || linkedCoA[0].accountType !== "revenue") {
        throw new Error(
          "Linked Chart of Account not found or is not a 'Revenue' type. Please link to an appropriate account."
        );
      }

      // Check for unique name
      const existingCategory = await tx
        .select({ id: incomeCategoriesTable.id })
        .from(incomeCategoriesTable)
        .where(
          and(
            eq(incomeCategoriesTable.name, values.name),
            eq(incomeCategoriesTable.isActive, true)
          )
        );
      if (existingCategory.length > 0) {
        throw new Error("Income category with this name already exists.");
      }

      const [newCategory] = await tx
        .insert(incomeCategoriesTable)
        .values(values)
        .returning();

      return newCategory;
    });

    revalidatePath("/settings/income-categories");
    revalidatePath("/accounting-and-finance/record-income");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating Income Category:", error);
    throw new Error(error.message || "Failed to create income category.");
  }
};

// Get Income Categories (with optional hierarchy and filtering)
export const getIncomeCategories = async (
  page: number = 0,
  limit: number = 10,
  getAllCategories: boolean = false,
  filters?: IncomeCategoryFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const conditions = buildFilterConditions(filters ?? {});

      let query = tx
        .select({
          category: incomeCategoriesTable,
          chartOfAccount: chartOfAccountsTable,
        })
        .from(incomeCategoriesTable)
        .leftJoin(
          chartOfAccountsTable,
          eq(incomeCategoriesTable.chartOfAccountsId, chartOfAccountsTable.id)
        )
        .$dynamic();

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(incomeCategoriesTable.createdAt));

      if (!getAllCategories && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const categories = await query;

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(incomeCategoriesTable)
        .leftJoin(
          chartOfAccountsTable,
          eq(incomeCategoriesTable.chartOfAccountsId, chartOfAccountsTable.id)
        )
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllCategories
        ? categories.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: categories,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error: any) {
    console.error("Error fetching Income Categories:", error);
    throw new Error(error.message || "Failed to fetch income categories.");
  }
};

// Get a single Income Category by ID
export const getIncomeCategoryById = async (id: string) => {
  try {
    const category = await db
      .select({
        category: incomeCategoriesTable,
        chartOfAccount: chartOfAccountsTable,
      })
      .from(incomeCategoriesTable)
      .leftJoin(
        chartOfAccountsTable,
        eq(incomeCategoriesTable.chartOfAccountsId, chartOfAccountsTable.id)
      )
      .where(
        and(
          eq(incomeCategoriesTable.id, id),
          eq(incomeCategoriesTable.isActive, true)
        )
      )
      .then((res) => res[0]);

    return parseStringify(category);
  } catch (error: any) {
    console.error("Error fetching Income Category by ID:", error);
    throw new Error(error.message || "Failed to fetch income category by ID.");
  }
};

// Update an Income Category
export const updateIncomeCategory = async (
  id: string,
  values: Partial<IncomeCategoryFormValues>
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentCategory = await tx.query.incomeCategoriesTable.findFirst({
        where: eq(incomeCategoriesTable.id, id),
      });
      if (!currentCategory) {
        throw new Error("Income category not found.");
      }

      // Validate linked Chart of Accounts ID if it's being updated
      if (values.chartOfAccountsId) {
        const linkedCoA = await tx
          .select({
            id: chartOfAccountsTable.id,
            accountType: chartOfAccountsTable.accountType,
          })
          .from(chartOfAccountsTable)
          .where(eq(chartOfAccountsTable.id, values.chartOfAccountsId));
        if (linkedCoA.length === 0 || linkedCoA[0].accountType !== "revenue") {
          throw new Error(
            "Linked Chart of Account not found or is not a 'Revenue' type. Please link to an appropriate account."
          );
        }
      }

      // Check for unique name
      if (values.name && values.name !== currentCategory.name) {
        const existingCategory = await tx
          .select({ id: incomeCategoriesTable.id })
          .from(incomeCategoriesTable)
          .where(
            and(
              eq(
                incomeCategoriesTable.name,
                values.name || currentCategory.name
              ),
              eq(incomeCategoriesTable.isActive, true),
              eq(incomeCategoriesTable.id, id)
            )
          );
        if (existingCategory.length > 0) {
          throw new Error("Income category with this name already exists.");
        }
      }

      const [updatedCategory] = await tx
        .update(incomeCategoriesTable)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(eq(incomeCategoriesTable.id, id))
        .returning();

      if (!updatedCategory) {
        throw new Error("Income Category not found or could not be updated.");
      }

      return updatedCategory;
    });

    revalidatePath("/settings/income-categories");
    revalidatePath("/accounting-and-finance/record-income");
    revalidatePath(`/settings/income-categories/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating Income Category:", error);
    throw new Error(error.message || "Failed to update income category.");
  }
};

// Soft delete an Income Category
export const softDeleteIncomeCategory = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if any income records are linked to this category
      const linkedIncomeRecords = await tx
        .select({ id: paymentsReceivedTable.id })
        .from(paymentsReceivedTable)
        .where(eq(paymentsReceivedTable.incomeCategoryId, id));

      if (linkedIncomeRecords.length > 0) {
        throw new Error(
          "Cannot delete category: It has associated income records. Only deactivation is allowed to preserve historical data."
        );
      }

      const [updatedCategory] = await tx
        .update(incomeCategoriesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(incomeCategoriesTable.id, id))
        .returning();

      if (!updatedCategory) {
        throw new Error(
          "Income Category not found or could not be deactivated."
        );
      }

      return updatedCategory;
    });

    revalidatePath("/settings/income-categories");
    revalidatePath("/accounting-and-finance/record-income");
    revalidatePath(`/settings/income-categories/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting Income Category:", error);
    throw new Error(error.message || "Failed to deactivate income category.");
  }
};
