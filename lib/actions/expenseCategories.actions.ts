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
        ilike(expenseCategoriesTable.description, searchTerm)
      )
    );
  }

  if (filters.parentId) {
    conditions.push(eq(expenseCategoriesTable.parentId, filters.parentId));
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

      // Check for unique name under the same parent
      const existingCategory = await tx
        .select({ id: expenseCategoriesTable.id })
        .from(expenseCategoriesTable)
        .where(
          and(
            eq(expenseCategoriesTable.name, values.name),
            values.parentId
              ? eq(expenseCategoriesTable.parentId, values.parentId)
              : sql`${expenseCategoriesTable.parentId} IS NULL`,
            eq(expenseCategoriesTable.isActive, true)
          )
        );
      if (existingCategory.length > 0) {
        throw new Error(
          "Expense category with this name already exists under the same parent."
        );
      }

      let parentDepth = 0;
      let calculatedPath = values.name;

      if (values.parentId) {
        const parentCategory = await tx
          .select({
            depth: expenseCategoriesTable.depth,
            path: expenseCategoriesTable.path,
          })
          .from(expenseCategoriesTable)
          .where(eq(expenseCategoriesTable.id, values.parentId))
          .then((res) => res[0]);

        if (parentCategory) {
          parentDepth = parentCategory.depth ?? 1 + 1;
          calculatedPath = `${parentCategory.path}/${values.name}`;
        } else {
          throw new Error("Parent expense category not found.");
        }
      }

      const [newCategory] = await tx
        .insert(expenseCategoriesTable)
        .values({
          ...values,
          depth: parentDepth,
          path: calculatedPath,
        })
        .returning();

      return newCategory;
    });

    revalidatePath("/settings/expense-categories");
    // Revalidate paths that might display expense categories (e.g., Add Expense form)
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

      const allCategories = await query;

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

      const total = await totalQuery.then((res) => res[0]?.count || 0);

      // Build hierarchy map for O(1) lookups
      const categoryMap = new Map(
        allCategories.map((cat) => [
          cat.expenseCategory.id,
          { ...cat, children: [] as any[] },
        ])
      );

      // Build parent-child relationships in a single pass
      for (const cat of allCategories) {
        const node = categoryMap.get(cat.expenseCategory.id)!;
        if (cat.expenseCategory.parentId) {
          const parent = categoryMap.get(cat.expenseCategory.parentId);
          if (parent) {
            if (!parent.children) {
              parent.children = [];
            }
            parent.children.push(node);
          }
        }
      }

      // Attach children to original category objects
      for (const cat of allCategories) {
        const node = categoryMap.get(cat.expenseCategory.id)!;
        (cat.expenseCategory as any).children = node.children.map(
          (child: any) => ({
            category: child.expenseCategory,
            chartOfAccount: child.chartOfAccount,
          })
        );
      }

      // Apply pagination if needed
      let paginatedCategories = allCategories;
      if (!getAllCategories && limit > 0) {
        const startIndex = page * limit;
        paginatedCategories = allCategories.slice(
          startIndex,
          startIndex + limit
        );
      }

      return {
        documents: paginatedCategories,
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

      // Check for unique name under the same parent if name or parent changes
      if (
        (values.name && values.name !== currentCategory.name) ||
        (values.parentId !== undefined &&
          values.parentId !== currentCategory.parentId)
      ) {
        const existingCategory = await tx
          .select({ id: expenseCategoriesTable.id })
          .from(expenseCategoriesTable)
          .where(
            and(
              eq(
                expenseCategoriesTable.name,
                values.name || currentCategory.name
              ),
              values.parentId !== undefined
                ? values.parentId !== null
                  ? eq(expenseCategoriesTable.parentId, values.parentId)
                  : sql`${expenseCategoriesTable.parentId} IS NULL`
                : sql`${expenseCategoriesTable.parentId} IS NULL`,
              eq(expenseCategoriesTable.isActive, true),
              eq(expenseCategoriesTable.id, id) // Exclude current category from check
            )
          );
        if (existingCategory.length > 0) {
          throw new Error(
            "Expense category with this name already exists under the same parent."
          );
        }
      }

      // Re-calculate path and depth if parentId or name changes
      let updatedPath: string | undefined;
      let updatedDepth: number | undefined;

      if (values.parentId !== undefined || values.name !== undefined) {
        const newParentId =
          values.parentId !== undefined
            ? values.parentId
            : currentCategory?.parentId;
        const newName =
          values.name !== undefined ? values.name : currentCategory?.name;

        if (newParentId) {
          const parentCategory =
            await tx.query.expenseCategoriesTable.findFirst({
              where: eq(expenseCategoriesTable.id, newParentId),
            });
          if (parentCategory) {
            updatedDepth = (parentCategory.depth || 0) + 1;
            updatedPath = `${parentCategory.path}/${newName}`;
          } else {
            throw new Error(
              "Parent expense category not found for re-pathing."
            );
          }
        } else {
          updatedDepth = 0;
          updatedPath = newName;
        }
      }

      const [updatedCategory] = await tx
        .update(expenseCategoriesTable)
        .set({
          ...values,
          path: updatedPath,
          depth: updatedDepth,
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
      // Check for active child categories
      const activeChildren = await tx
        .select({ id: expenseCategoriesTable.id })
        .from(expenseCategoriesTable)
        .where(
          and(
            eq(expenseCategoriesTable.parentId, id),
            eq(expenseCategoriesTable.isActive, true)
          )
        );
      if (activeChildren.length > 0) {
        throw new Error(
          "Cannot delete category: It has active child categories. Please deactivate children first."
        );
      }

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
