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
  ExpenseCategoryFormValidation,
  ExpenseCategoryFilters,
} from "../validation";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { expenseCategoriesTable } from "@/drizzle/schema";

// Add a new Expense Category
export const addExpenseCategory = async (values: ExpenseCategoryFormValues) => {
  const parsedValues = ExpenseCategoryFormValidation.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Expense Category data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Validate linked Chart of Accounts ID (must be 'expense' or 'cogs' type)
      const linkedCoA = await tx
        .select({
          id: chartOfAccountsTable.id,
          accountType: chartOfAccountsTable.accountType,
        })
        .from(chartOfAccountsTable)
        .where(
          eq(chartOfAccountsTable.id, parsedValues.data.chartOfAccountsId)
        );
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
            eq(expenseCategoriesTable.name, parsedValues.data.name),
            parsedValues.data.parentId
              ? eq(expenseCategoriesTable.parentId, parsedValues.data.parentId)
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
      let calculatedPath = parsedValues.data.name;

      if (parsedValues.data.parentId) {
        const parentCategory = await tx
          .select({
            depth: expenseCategoriesTable.depth,
            path: expenseCategoriesTable.path,
          })
          .from(expenseCategoriesTable)
          .where(eq(expenseCategoriesTable.id, parsedValues.data.parentId))
          .then((res) => res[0]);

        if (parentCategory) {
          parentDepth = parentCategory.depth ?? 1 + 1;
          calculatedPath = `${parentCategory.path}/${parsedValues.data.name}`;
        } else {
          throw new Error("Parent expense category not found.");
        }
      }

      const [newCategory] = await tx
        .insert(expenseCategoriesTable)
        .values({
          ...parsedValues.data,
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
  parentId: string | null = null,
  includeChildren: boolean = false,
  filters?: ExpenseCategoryFilters
) => {
  try {
    const categories = await db.transaction(async (tx) => {
      let query = tx
        .select({
          category: expenseCategoriesTable,
          chartOfAccount: chartOfAccountsTable,
        })
        .from(expenseCategoriesTable)
        .leftJoin(
          chartOfAccountsTable,
          eq(expenseCategoriesTable.chartOfAccountsId, chartOfAccountsTable.id)
        )
        .where(eq(expenseCategoriesTable.isActive, true))
        .$dynamic();

      if (filters?.search) {
        const searchTerm = `%${filters.search.trim()}%`;
        query = query.where(or(ilike(expenseCategoriesTable.name, searchTerm)));
      }

      if (parentId === null && !filters?.parentId) {
        query = query.where(sql`${expenseCategoriesTable.parentId} IS NULL`); // Only top-level categories
      } else if (filters?.parentId) {
        query = query.where(
          eq(expenseCategoriesTable.parentId, filters.parentId)
        );
      } else if (parentId) {
        query = query.where(eq(expenseCategoriesTable.parentId, parentId));
      }

      query = query.orderBy(expenseCategoriesTable.name);
      const rootCategories = await query;

      const fetchChildren = async (
        parentCatId: string,
        currentDepth: number
      ) => {
        const children = await tx
          .select({
            category: expenseCategoriesTable,
            chartOfAccount: chartOfAccountsTable,
          })
          .from(expenseCategoriesTable)
          .leftJoin(
            chartOfAccountsTable,
            eq(
              expenseCategoriesTable.chartOfAccountsId,
              chartOfAccountsTable.id
            )
          )
          .where(
            and(
              eq(expenseCategoriesTable.parentId, parentCatId),
              eq(expenseCategoriesTable.isActive, true)
            )
          )
          .orderBy(expenseCategoriesTable.name);

        if (includeChildren && children.length > 0) {
          for (const child of children) {
            (child.category as any).children = await fetchChildren(
              child.category.id,
              currentDepth + 1
            );
          }
        }
        return children;
      };

      if (includeChildren) {
        for (const cat of rootCategories) {
          (cat.category as any).children = await fetchChildren(
            cat.category.id,
            0
          );
        }
      }

      return rootCategories;
    });

    return parseStringify(categories);
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
        category: expenseCategoriesTable,
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
  const parsedValues =
    ExpenseCategoryFormValidation.partial().safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Expense Category data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const currentCategory = await tx.query.expenseCategoriesTable.findFirst({
        where: eq(expenseCategoriesTable.id, id),
      });
      if (!currentCategory) {
        throw new Error("Expense category not found.");
      }

      // Validate linked Chart of Accounts ID if it's being updated
      if (parsedValues.data.chartOfAccountsId) {
        const linkedCoA = await tx
          .select({
            id: chartOfAccountsTable.id,
            accountType: chartOfAccountsTable.accountType,
          })
          .from(chartOfAccountsTable)
          .where(
            eq(chartOfAccountsTable.id, parsedValues.data.chartOfAccountsId)
          );
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
        (parsedValues.data.name &&
          parsedValues.data.name !== currentCategory.name) ||
        (parsedValues.data.parentId !== undefined &&
          parsedValues.data.parentId !== currentCategory.parentId)
      ) {
        const existingCategory = await tx
          .select({ id: expenseCategoriesTable.id })
          .from(expenseCategoriesTable)
          .where(
            and(
              eq(
                expenseCategoriesTable.name,
                parsedValues.data.name || currentCategory.name
              ),
              parsedValues.data.parentId !== undefined
                ? parsedValues.data.parentId !== null
                  ? eq(
                      expenseCategoriesTable.parentId,
                      parsedValues.data.parentId
                    )
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

      if (
        parsedValues.data.parentId !== undefined ||
        parsedValues.data.name !== undefined
      ) {
        const newParentId =
          parsedValues.data.parentId !== undefined
            ? parsedValues.data.parentId
            : currentCategory?.parentId;
        const newName =
          parsedValues.data.name !== undefined
            ? parsedValues.data.name
            : currentCategory?.name;

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
          ...parsedValues.data,
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
