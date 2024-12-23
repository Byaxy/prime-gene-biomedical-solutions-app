"use server";

import { ID, Query } from "node-appwrite";
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
export const getCategories = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_CATEGORIES_COLLECTION_ID!,
      [Query.equal("isActive", true), Query.orderDesc("$createdAt")]
    );

    return parseStringify(response.documents);
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
