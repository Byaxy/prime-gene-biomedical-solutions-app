/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import {
  accompanyingExpenseTypesTable,
  chartOfAccountsTable,
  expensesTable,
} from "@/drizzle/schema";
import {
  ExpenseCategoryFormValues,
  ExpenseCategoryFilters,
} from "../validation";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { expenseCategoriesTable } from "@/drizzle/schema";

const buildFilterConditions = (filters: ExpenseCategoryFilters) => {
  const conditions = [];

  conditions.push(eq(expenseCategoriesTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(expenseCategoriesTable.name, searchTerm),
        ilike(expenseCategoriesTable.description, searchTerm),
        ilike(chartOfAccountsTable.accountName, searchTerm),
        ilike(chartOfAccountsTable.accountType, searchTerm)
      )
    );
  }

  if (filters.chartOfAccountsId) {
    conditions.push(
      eq(expenseCategoriesTable.chartOfAccountsId, filters.chartOfAccountsId)
    );
  }

  return conditions;
};

// Add a new Expense Category
export const addExpenseCategory = async (values: ExpenseCategoryFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Validate linked Chart of Accounts ID (must be 'expense' or 'cogs' type)
      const linkedCoA = await tx
        .select({
          id: chartOfAccountsTable.id,
          accountType: chartOfAccountsTable.accountType,
        })
        .from(chartOfAccountsTable)
        .where(eq(chartOfAccountsTable.id, values.chartOfAccountsId));
      if (linkedCoA.length === 0 || !(linkedCoA[0].accountType === "expense")) {
        throw new Error(
          "Linked Chart of Account not found or is not an 'Expense' or 'Cost of Goods Sold' type. Please link to an appropriate account."
        );
      }

      // Check for unique name
      const existingCategory = await tx
        .select({ id: expenseCategoriesTable.id })
        .from(expenseCategoriesTable)
        .where(
          and(
            eq(expenseCategoriesTable.name, values.name),
            eq(expenseCategoriesTable.isActive, true)
          )
        );
      if (existingCategory.length > 0) {
        throw new Error("Expense category with this name already exists.");
      }

      const [newCategory] = await tx
        .insert(expenseCategoriesTable)
        .values(values)
        .returning();

      return newCategory;
    });

    revalidatePath("/settings/expense-categories");
    revalidatePath("/expenses/add-expense");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating Expense Category:", error);
    throw new Error(error.message || "Failed to create expense category.");
  }
};

// Get Expense Categories (with optional hierarchy and filtering)
export const getExpenseCategories = async (
  page: number = 0,
  limit: number = 10,
  getAllCategories: boolean = false,
  filters?: ExpenseCategoryFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Build filter conditions
      const conditions = buildFilterConditions(filters ?? {});

      // Fetch all matching categories in a single query
      let query = tx
        .select({
          expenseCategory: expenseCategoriesTable,
          chartOfAccount: chartOfAccountsTable,
        })
        .from(expenseCategoriesTable)
        .leftJoin(
          chartOfAccountsTable,
          eq(expenseCategoriesTable.chartOfAccountsId, chartOfAccountsTable.id)
        )
        .$dynamic();

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(expenseCategoriesTable.createdAt));

      if (!getAllCategories && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const categories = await query;

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(expenseCategoriesTable)
        .leftJoin(
          chartOfAccountsTable,
          eq(expenseCategoriesTable.chartOfAccountsId, chartOfAccountsTable.id)
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
    console.error("Error fetching Expense Categories:", error);
    throw new Error(error.message || "Failed to fetch expense categories.");
  }
};

// Get a single Expense Category by ID
export const getExpenseCategoryById = async (id: string) => {
  try {
    const category = await db
      .select({
        expenseCategory: expenseCategoriesTable,
        chartOfAccount: chartOfAccountsTable,
      })
      .from(expenseCategoriesTable)
      .leftJoin(
        chartOfAccountsTable,
        eq(expenseCategoriesTable.chartOfAccountsId, chartOfAccountsTable.id)
      )
      .where(
        and(
          eq(expenseCategoriesTable.id, id),
          eq(expenseCategoriesTable.isActive, true)
        )
      )
      .then((res) => res[0]);

    return parseStringify(category);
  } catch (error: any) {
    console.error("Error fetching Expense Category by ID:", error);
    throw new Error(error.message || "Failed to fetch expense category by ID.");
  }
};

// Update an Expense Category
export const updateExpenseCategory = async (
  id: string,
  values: Partial<ExpenseCategoryFormValues>
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentCategory = await tx.query.expenseCategoriesTable.findFirst({
        where: eq(expenseCategoriesTable.id, id),
      });
      if (!currentCategory) {
        throw new Error("Expense category not found.");
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
        if (
          linkedCoA.length === 0 ||
          !(linkedCoA[0].accountType === "expense")
        ) {
          throw new Error(
            "Linked Chart of Account not found or is not an 'Expense' or 'Cost of Goods Sold' type."
          );
        }
      }

      // Check for unique name
      if (values.name && values.name !== currentCategory.name) {
        const existingCategory = await tx
          .select({ id: expenseCategoriesTable.id })
          .from(expenseCategoriesTable)
          .where(
            and(
              eq(
                expenseCategoriesTable.name,
                values.name || currentCategory.name
              ),
              eq(expenseCategoriesTable.isActive, true),
              eq(expenseCategoriesTable.id, id)
            )
          );
        if (existingCategory.length > 0) {
          throw new Error("Expense category with this name already exists.");
        }
      }

      const [updatedCategory] = await tx
        .update(expenseCategoriesTable)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(eq(expenseCategoriesTable.id, id))
        .returning();

      if (!updatedCategory) {
        throw new Error("Expense Category not found or could not be updated.");
      }

      return updatedCategory;
    });

    revalidatePath("/settings/expense-categories");
    revalidatePath("/expenses/add-expense");
    revalidatePath(`/settings/expense-categories/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating Expense Category:", error);
    throw new Error(error.message || "Failed to update expense category.");
  }
};

// Soft delete an Expense Category
export const softDeleteExpenseCategory = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if any expenses are linked to this category
      const linkedExpenses = await tx
        .select({ id: expensesTable.id })
        .from(expensesTable)
        .where(eq(expensesTable.expenseCategoryId, id));

      if (linkedExpenses.length > 0) {
        throw new Error(
          "Cannot delete category: It has associated expenses. Only deactivation is allowed to preserve historical data."
        );
      }

      // Check if any accompanying expense types default to this category
      const linkedAccompanyingTypes = await tx
        .select({ id: accompanyingExpenseTypesTable.id })
        .from(accompanyingExpenseTypesTable)
        .where(eq(accompanyingExpenseTypesTable.defaultExpenseCategoryId, id));

      if (linkedAccompanyingTypes.length > 0) {
        throw new Error(
          "Cannot delete category: It is set as a default for existing accompanying expense types. Please update them first."
        );
      }

      const [updatedCategory] = await tx
        .update(expenseCategoriesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(expenseCategoriesTable.id, id))
        .returning();

      if (!updatedCategory) {
        throw new Error(
          "Expense Category not found or could not be deactivated."
        );
      }

      return updatedCategory;
    });

    revalidatePath("/settings/expense-categories");
    revalidatePath("/expenses/add-expense");
    revalidatePath(`/settings/expense-categories/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting Expense Category:", error);
    throw new Error(error.message || "Failed to deactivate expense category.");
  }
};
