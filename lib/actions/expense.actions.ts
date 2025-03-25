"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { ExpenseFormValues } from "../validation";
import { db } from "@/drizzle/db";
import { expensesTable } from "@/drizzle/schema";
import { PaymentMethod } from "@/types";
import { desc, eq } from "drizzle-orm";

// Add Expense
export const addExpense = async (expenseData: ExpenseFormValues) => {
  try {
    const insertedExpense = await db
      .insert(expensesTable)
      .values({
        ...expenseData,
        paymentMethod: expenseData.paymentMethod as PaymentMethod,
      })
      .returning();

    revalidatePath("/expenses");
    return parseStringify(insertedExpense);
  } catch (error) {
    console.error("Error adding Expense:", error);
    throw error;
  }
};

// Get Expense By ID
export const getExpenseById = async (expenseId: string) => {
  try {
    const response = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expenseId))
      .then((res) => res[0]);

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting expense by ID:", error);
    throw error;
  }
};

// Get Expenses
export const getExpenses = async (
  page: number = 0,
  limit: number = 10,
  getAllExpenses: boolean = false
) => {
  try {
    let query = db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.isActive, true))
      .orderBy(desc(expensesTable.createdAt));

    if (!getAllExpenses) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).limit(limit).offset(page * limit);
    }

    const expenses = await query;

    // For getAllExpenses, fetch all expenses in batches (if needed)
    if (getAllExpenses) {
      let allExpenses: typeof expenses = [];
      let offset = 0;
      const batchSize = 100;

      while (true) {
        const batch = await db
          .select()
          .from(expensesTable)
          .where(eq(expensesTable.isActive, true))
          .orderBy(desc(expensesTable.createdAt))
          .limit(batchSize)
          .offset(offset);

        allExpenses = [...allExpenses, ...batch];

        // If we got fewer expenses than the batch size, we've reached the end
        if (batch.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allExpenses),
        total: allExpenses.length,
      };
    }

    // For paginated results
    const total = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.isActive, true))
      .then((res) => res.length);

    return {
      documents: parseStringify(expenses),
      total,
    };
  } catch (error) {
    console.error("Error getting expenses:", error);
    throw error;
  }
};

// Edit Expense
export const editExpense = async (
  expenseData: ExpenseFormValues,
  expenseId: string
) => {
  try {
    const updatedExpense = await db
      .update(expensesTable)
      .set({
        ...expenseData,
        paymentMethod: expenseData.paymentMethod as PaymentMethod,
      })
      .where(eq(expensesTable.id, expenseId))
      .returning();

    revalidatePath("/expenses");
    revalidatePath(`/expenses/edit-expense/${expenseId}`);
    return parseStringify(updatedExpense);
  } catch (error) {
    console.error("Error editing expense:", error);
    throw error;
  }
};

// Permanently Delete Expense
export const deleteExpense = async (expenseId: string) => {
  try {
    const deletedExpense = await db
      .delete(expensesTable)
      .where(eq(expensesTable.id, expenseId))
      .returning();

    revalidatePath("/expenses");
    return parseStringify(deletedExpense);
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

// Soft Delete Expense
export const softDeleteExpense = async (expenseId: string) => {
  try {
    const updatedExpense = await db
      .update(expensesTable)
      .set({ isActive: false })
      .where(eq(expensesTable.id, expenseId))
      .returning();

    revalidatePath("/expenses");
    return parseStringify(updatedExpense);
  } catch (error) {
    console.error("Error soft deleting expense:", error);
    throw error;
  }
};
