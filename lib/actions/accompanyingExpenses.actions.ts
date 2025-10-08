/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import {
  AccompanyingExpenseTypeFormValues,
  ExpenseCategoryFilters,
} from "../validation";
import { AccompanyingExpenseTypeFormValidation } from "../validation";
import { db } from "@/drizzle/db";
import {
  accompanyingExpenseTypesTable,
  billPaymentAccompanyingExpensesTable,
  expensesTable,
} from "@/drizzle/schema";
import { expenseCategoriesTable } from "@/drizzle/schema";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { and, eq, ilike, or, sql } from "drizzle-orm";

// Add a new Accompanying Expense Type
export const addAccompanyingExpenseType = async (
  values: AccompanyingExpenseTypeFormValues
) => {
  const parsedValues = AccompanyingExpenseTypeFormValidation.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Accompanying Expense Type data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Check for unique name
      const existingType = await tx
        .select({ id: accompanyingExpenseTypesTable.id })
        .from(accompanyingExpenseTypesTable)
        .where(
          and(
            eq(accompanyingExpenseTypesTable.name, parsedValues.data.name),
            eq(accompanyingExpenseTypesTable.isActive, true)
          )
        );
      if (existingType.length > 0) {
        throw new Error(
          "Accompanying Expense Type with this name already exists."
        );
      }

      // Validate defaultExpenseCategoryId if provided
      if (parsedValues.data.defaultExpenseCategoryId) {
        const defaultCategory = await tx
          .select({ id: expenseCategoriesTable.id })
          .from(expenseCategoriesTable)
          .where(
            and(
              eq(
                expenseCategoriesTable.id,
                parsedValues.data.defaultExpenseCategoryId
              ),
              eq(expenseCategoriesTable.isActive, true)
            )
          );
        if (defaultCategory.length === 0) {
          throw new Error("Default Expense Category not found or is inactive.");
        }
      }

      const [newType] = await tx
        .insert(accompanyingExpenseTypesTable)
        .values(parsedValues.data)
        .returning();

      return newType;
    });

    revalidatePath("/settings/accompanying-expense-types");
    // Also revalidate paths where these types might be used (e.g., Add Expense, Pay Bill)
    revalidatePath("/expenses/add-expense");
    revalidatePath("/vendors/pay-bills");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating Accompanying Expense Type:", error);
    throw new Error(
      error.message || "Failed to create accompanying expense type."
    );
  }
};

// Get Accompanying Expense Types (with optional filtering)
export const getAccompanyingExpenseTypes = async (
  filters?: ExpenseCategoryFilters
) => {
  try {
    const types = await db.transaction(async (tx) => {
      let query = tx
        .select({
          type: accompanyingExpenseTypesTable,
          defaultCategory: expenseCategoriesTable,
        })
        .from(accompanyingExpenseTypesTable)
        .leftJoin(
          expenseCategoriesTable,
          eq(
            accompanyingExpenseTypesTable.defaultExpenseCategoryId,
            expenseCategoriesTable.id
          )
        )
        .where(eq(accompanyingExpenseTypesTable.isActive, true))
        .$dynamic();

      if (filters?.search) {
        const searchTerm = `%${filters.search.trim()}%`;
        query = query.where(
          or(ilike(accompanyingExpenseTypesTable.name, searchTerm))
        );
      }

      query = query.orderBy(accompanyingExpenseTypesTable.name);
      return await query;
    });

    return parseStringify(types);
  } catch (error: any) {
    console.error("Error fetching Accompanying Expense Types:", error);
    throw new Error(
      error.message || "Failed to fetch accompanying expense types."
    );
  }
};

// Get a single Accompanying Expense Type by ID
export const getAccompanyingExpenseTypeById = async (id: string) => {
  try {
    const type = await db
      .select({
        type: accompanyingExpenseTypesTable,
        defaultCategory: expenseCategoriesTable,
      })
      .from(accompanyingExpenseTypesTable)
      .leftJoin(
        expenseCategoriesTable,
        eq(
          accompanyingExpenseTypesTable.defaultExpenseCategoryId,
          expenseCategoriesTable.id
        )
      )
      .where(
        and(
          eq(accompanyingExpenseTypesTable.id, id),
          eq(accompanyingExpenseTypesTable.isActive, true)
        )
      )
      .then((res) => res[0]);

    return parseStringify(type);
  } catch (error: any) {
    console.error("Error fetching Accompanying Expense Type by ID:", error);
    throw new Error(
      error.message || "Failed to fetch accompanying expense type by ID."
    );
  }
};

// Update an Accompanying Expense Type
export const updateAccompanyingExpenseType = async (
  id: string,
  values: Partial<AccompanyingExpenseTypeFormValues>
) => {
  const parsedValues =
    AccompanyingExpenseTypeFormValidation.partial().safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Accompanying Expense Type data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const currentType =
        await tx.query.accompanyingExpenseTypesTable.findFirst({
          where: eq(accompanyingExpenseTypesTable.id, id),
        });
      if (!currentType) {
        throw new Error("Accompanying Expense Type not found.");
      }

      // Check for unique name if name changes
      if (
        parsedValues.data.name &&
        parsedValues.data.name !== currentType.name
      ) {
        const existingType = await tx
          .select({ id: accompanyingExpenseTypesTable.id })
          .from(accompanyingExpenseTypesTable)
          .where(
            and(
              eq(accompanyingExpenseTypesTable.name, parsedValues.data.name),
              eq(accompanyingExpenseTypesTable.isActive, true),
              sql`${accompanyingExpenseTypesTable.id} != ${id}` // Exclude current type
            )
          );
        if (existingType.length > 0) {
          throw new Error(
            "Accompanying Expense Type with this name already exists."
          );
        }
      }

      // Validate defaultExpenseCategoryId if provided
      if (parsedValues.data.defaultExpenseCategoryId) {
        const defaultCategory = await tx
          .select({ id: expenseCategoriesTable.id })
          .from(expenseCategoriesTable)
          .where(
            and(
              eq(
                expenseCategoriesTable.id,
                parsedValues.data.defaultExpenseCategoryId
              ),
              eq(expenseCategoriesTable.isActive, true)
            )
          );
        if (defaultCategory.length === 0) {
          throw new Error("Default Expense Category not found or is inactive.");
        }
      }

      const [updatedType] = await tx
        .update(accompanyingExpenseTypesTable)
        .set({
          ...parsedValues.data,
          updatedAt: new Date(),
        })
        .where(eq(accompanyingExpenseTypesTable.id, id))
        .returning();

      if (!updatedType) {
        throw new Error(
          "Accompanying Expense Type not found or could not be updated."
        );
      }

      return updatedType;
    });

    revalidatePath("/settings/accompanying-expense-types");
    revalidatePath("/expenses/add-expense");
    revalidatePath("/vendors/pay-bills");
    revalidatePath(`/settings/accompanying-expense-types/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating Accompanying Expense Type:", error);
    throw new Error(
      error.message || "Failed to update accompanying expense type."
    );
  }
};

// Soft delete an Accompanying Expense Type
export const softDeleteAccompanyingExpenseType = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if any expenses are directly linked to this accompanying expense type
      const linkedExpenses = await tx
        .select({ id: expensesTable.id })
        .from(expensesTable)
        .where(eq(expensesTable.accompanyingExpenseTypeId, id));
      if (linkedExpenses.length > 0) {
        throw new Error(
          "Cannot delete type: It has associated expenses. Only deactivation is allowed to preserve historical data."
        );
      }

      // Check if any bill payment accompanying expenses are linked to this type
      const linkedBillPaymentAccompanyingExpenses = await tx
        .select({ id: billPaymentAccompanyingExpensesTable.id })
        .from(billPaymentAccompanyingExpensesTable)
        .where(
          eq(billPaymentAccompanyingExpensesTable.accompanyingExpenseTypeId, id)
        );
      if (linkedBillPaymentAccompanyingExpenses.length > 0) {
        throw new Error(
          "Cannot delete type: It has associated bill payment expenses. Only deactivation is allowed to preserve historical data."
        );
      }

      const [updatedType] = await tx
        .update(accompanyingExpenseTypesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(accompanyingExpenseTypesTable.id, id))
        .returning();

      if (!updatedType) {
        throw new Error(
          "Accompanying Expense Type not found or could not be deactivated."
        );
      }

      return updatedType;
    });

    revalidatePath("/settings/accompanying-expense-types");
    revalidatePath("/expenses/add-expense");
    revalidatePath("/vendors/pay-bills");
    revalidatePath(`/settings/accompanying-expense-types/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting Accompanying Expense Type:", error);
    throw new Error(
      error.message || "Failed to deactivate accompanying expense type."
    );
  }
};
