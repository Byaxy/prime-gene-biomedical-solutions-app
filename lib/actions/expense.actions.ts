"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_EXPENSES_COLLECTION_ID,
} from "../appwrite-server";
import { ExpenseFormValues } from "../validation";

// Add Expense
export const addExpense = async (expenseData: ExpenseFormValues) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_EXPENSES_COLLECTION_ID!,
      ID.unique(),
      expenseData
    );

    revalidatePath("/expenses");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding expense:", error);
    throw error;
  }
};

// Get Expenses
export const getExpenses = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_EXPENSES_COLLECTION_ID!,
      [Query.equal("isActive", true), Query.orderDesc("$createdAt")]
    );

    return parseStringify(response.documents);
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
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_EXPENSES_COLLECTION_ID!,
      expenseId,
      expenseData
    );

    revalidatePath("/expenses");
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing expense:", error);
    throw error;
  }
};

// Permanently Delete Expense
export const deleteExpense = async (expenseId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_EXPENSES_COLLECTION_ID!,
      expenseId
    );

    revalidatePath("/expenses");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

// Soft Delete Expense
export const softDeleteExpense = async (expenseId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_EXPENSES_COLLECTION_ID!,
      expenseId,
      { isActive: false }
    );

    revalidatePath("/expenses");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting expense:", error);
    throw error;
  }
};
