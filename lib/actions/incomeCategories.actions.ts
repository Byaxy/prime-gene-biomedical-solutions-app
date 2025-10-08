/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/drizzle/db";
import {
     IncomeCategoryFilters,
  IncomeCategoryFormValidation,
  IncomeCategoryFormValues,
} from "../validation";
import { chartOfAccountsTable, incomeCategoriesTable, paymentsReceivedTable } from "@/drizzle/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

// Add a new Income Category
export const addIncomeCategory = async (values: IncomeCategoryFormValues) => {
  const parsedValues = IncomeCategoryFormValidation.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Income Category data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Validate linked Chart of Accounts ID (must be 'revenue' type)
      const linkedCoA = await tx
        .select({
          id: chartOfAccountsTable.id,
          accountType: chartOfAccountsTable.accountType,
        })
        .from(chartOfAccountsTable)
        .where(
          eq(chartOfAccountsTable.id, parsedValues.data.chartOfAccountsId)
        );
      if (linkedCoA.length === 0 || linkedCoA[0].accountType !== "revenue") {
        throw new Error(
          "Linked Chart of Account not found or is not a 'Revenue' type. Please link to an appropriate account."
        );
      }

      // Check for unique name under the same parent
      const existingCategory = await tx
        .select({ id: incomeCategoriesTable.id })
        .from(incomeCategoriesTable)
        .where(
          and(
            eq(incomeCategoriesTable.name, parsedValues.data.name),
            parsedValues.data.parentId !== null && parsedValues.data.parentId !== undefined
              ? eq(incomeCategoriesTable.parentId, parsedValues.data.parentId)
              : sql`${incomeCategoriesTable.parentId} IS NULL`,
            eq(incomeCategoriesTable.isActive, true)
          )
        );
      if (existingCategory.length > 0) {
        throw new Error(
          "Income category with this name already exists under the same parent."
        );
      }

      let parentDepth = 0;
      let calculatedPath = parsedValues.data.name;

      if (parsedValues.data.parentId) {
        const parentCategory = await tx
          .select({
            depth: incomeCategoriesTable.depth,
            path: incomeCategoriesTable.path,
          })
          .from(incomeCategoriesTable)
          .where(eq(incomeCategoriesTable.id, parsedValues.data.parentId))
          .then((res) => res[0]);

        if (parentCategory) {
          parentDepth = parentCategory.depth ?? 1 + 1;
          calculatedPath = `${parentCategory.path}/${parsedValues.data.name}`;
        } else {
          throw new Error("Parent income category not found.");
        }
      }

      const [newCategory] = await tx
        .insert(incomeCategoriesTable)
        .values({
          ...parsedValues.data,
          depth: parentDepth,
          path: calculatedPath,
        })
        .returning();

      return newCategory;
    });

    revalidatePath("/settings/income-categories");
    // Revalidate paths that might display income categories (e.g., Record Income form)
    revalidatePath("/accounting-and-finance/record-income");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating Income Category:", error);
    throw new Error(error.message || "Failed to create income category.");
  }
};

// Get Income Categories (with optional hierarchy and filtering)
export const getIncomeCategories = async (
  parentId: string | null = null,
  includeChildren: boolean = false,
  filters?: IncomeCategoryFilters
) => {
  try {
    const categories = await db.transaction(async (tx) => {
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
        .where(eq(incomeCategoriesTable.isActive, true))
        .$dynamic();

      if (filters?.search) {
        const searchTerm = `%${filters.search.trim()}%`;
        query = query.where(or(ilike(incomeCategoriesTable.name, searchTerm)));
      }

      if (parentId === null && !filters?.parentId) {
        query = query.where(sql`${incomeCategoriesTable.parentId} IS NULL`);
      } else if (filters?.parentId) {
        query = query.where(
          eq(incomeCategoriesTable.parentId, filters.parentId)
        );
      } else if (parentId) {
        query = query.where(eq(incomeCategoriesTable.parentId, parentId));
      }

      query = query.orderBy(incomeCategoriesTable.name);
      const rootCategories = await query;

      const fetchChildren = async (
        parentCatId: string,
        currentDepth: number
      ) => {
        const children = await tx
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
              eq(incomeCategoriesTable.parentId, parentCatId),
              eq(incomeCategoriesTable.isActive, true)
            )
          )
          .orderBy(incomeCategoriesTable.name);

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
  const parsedValues = IncomeCategoryFormValidation.partial().safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Income Category data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const currentCategory = await tx.query.incomeCategoriesTable.findFirst({
        where: eq(incomeCategoriesTable.id, id),
      });
      if (!currentCategory) {
        throw new Error("Income category not found.");
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
        if (linkedCoA.length === 0 || linkedCoA[0].accountType !== "revenue") {
          throw new Error(
            "Linked Chart of Account not found or is not a 'Revenue' type. Please link to an appropriate account."
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
          .select({ id: incomeCategoriesTable.id })
          .from(incomeCategoriesTable)
          .where(
            and(
              eq(
                incomeCategoriesTable.name,
                parsedValues.data.name || currentCategory.name
              ),
              parsedValues.data.parentId !== undefined && parsedValues.data.parentId !== null
                ? eq(incomeCategoriesTable.parentId, parsedValues.data.parentId)
                : sql`${incomeCategoriesTable.parentId} IS NULL`,
              eq(incomeCategoriesTable.isActive, true),
              eq(incomeCategoriesTable.id, id) // Exclude current category from check
            )
          );
        if (existingCategory.length > 0) {
          throw new Error(
            "Income category with this name already exists under the same parent."
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
          const parentCategory = await tx.query.incomeCategoriesTable.findFirst(
            {
              where: eq(incomeCategoriesTable.id, newParentId),
            }
          );
          if (parentCategory) {
            updatedDepth = (parentCategory.depth || 0) + 1;
            updatedPath = `${parentCategory.path}/${newName}`;
          } else {
            throw new Error("Parent income category not found for re-pathing.");
          }
        } else {
          updatedDepth = 0;
          updatedPath = newName;
        }
      }

      const [updatedCategory] = await tx
        .update(incomeCategoriesTable)
        .set({
          ...parsedValues.data,
          path: updatedPath,
          depth: updatedDepth,
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
      // Check for active child categories
      const activeChildren = await tx
        .select({ id: incomeCategoriesTable.id })
        .from(incomeCategoriesTable)
        .where(
          and(
            eq(incomeCategoriesTable.parentId, id),
            eq(incomeCategoriesTable.isActive, true)
          )
        );
      if (activeChildren.length > 0) {
        throw new Error(
          "Cannot delete category: It has active child categories. Please deactivate children first."
        );
      }

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
