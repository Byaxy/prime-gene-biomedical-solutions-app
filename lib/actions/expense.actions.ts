"use server";

import { ID, Models, Query } from "node-appwrite";
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
export const getExpenses = async (
  page: number = 0,
  limit: number = 10,
  getAllExpenses: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllExpenses) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));

      const response = await databases.listDocuments(
        DATABASE_ID!,
        NEXT_PUBLIC_EXPENSES_COLLECTION_ID!,
        queries
      );

      return {
        documents: parseStringify(response.documents),
        total: response.total,
      };
    } else {
      let allDocuments: Models.Document[] = [];
      let offset = 0;
      const batchSize = 100; // Maximum limit per request(appwrite's max)

      while (true) {
        const batchQueries = [
          Query.equal("isActive", true),
          Query.orderDesc("$createdAt"),
          Query.limit(batchSize),
          Query.offset(offset),
        ];

        const response = await databases.listDocuments(
          DATABASE_ID!,
          NEXT_PUBLIC_EXPENSES_COLLECTION_ID!,
          batchQueries
        );

        const documents = response.documents;
        allDocuments = [...allDocuments, ...documents];

        // If we got fewer documents than the batch size, we've reached the end
        if (documents.length < batchSize) {
          break;
        }

        offset += batchSize;
      }

      return {
        documents: parseStringify(allDocuments),
        total: allDocuments.length,
      };
    }
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
