"use server";

import { ID, Models, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_CATEGORIES_COLLECTION_ID,
} from "../appwrite-server";
import { CategoryFormValues } from "../validation";

// Add Category
export const addCategory = async (categoryData: CategoryFormValues) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_CATEGORIES_COLLECTION_ID!,
      ID.unique(),
      categoryData
    );

    revalidatePath("/products/categories");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

// Get Categories
export const getCategories = async (
  page: number = 0,
  limit: number = 10,
  getAllCategories: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllCategories) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));

      const response = await databases.listDocuments(
        DATABASE_ID!,
        NEXT_PUBLIC_CATEGORIES_COLLECTION_ID!,
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
          NEXT_PUBLIC_CATEGORIES_COLLECTION_ID!,
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
    console.error("Error getting categories:", error);
    throw error;
  }
};

// Edit Category
export const editCategory = async (
  categoryData: CategoryFormValues,
  categoryId: string
) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_CATEGORIES_COLLECTION_ID!,
      categoryId,
      categoryData
    );

    revalidatePath("/products/categories");
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing category:", error);
    throw error;
  }
};

// Permanently Delete Category
export const deleteCategory = async (categoryId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_CATEGORIES_COLLECTION_ID!,
      categoryId
    );

    revalidatePath("/products/categories");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

// Soft Delete Category
export const softDeleteCategory = async (categoryId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_CATEGORIES_COLLECTION_ID!,
      categoryId,
      { isActive: false }
    );

    revalidatePath("/products/categories");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting category:", error);
    throw error;
  }
};
