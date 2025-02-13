"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_COLORS_COLLECTION_ID,
} from "../appwrite-server";
import { ColorFormValues } from "../validation";

// Add Colors
export const addColor = async (colorData: ColorFormValues) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_COLORS_COLLECTION_ID!,
      ID.unique(),
      colorData
    );

    revalidatePath("/products/colors");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding color:", error);
    throw error;
  }
};

// Get Colors
export const getColors = async (
  page: number = 0,
  limit: number = 10,
  getAllColors: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllColors) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));
    }

    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_COLORS_COLLECTION_ID!,
      queries
    );

    return {
      documents: parseStringify(response.documents),
      total: response.total,
    };
  } catch (error) {
    console.error("Error getting colors:", error);
    throw error;
  }
};

// Edit Colors
export const editColor = async (
  colorData: ColorFormValues,
  colorId: string
) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_COLORS_COLLECTION_ID!,
      colorId,
      colorData
    );

    revalidatePath("/products/colors");
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing color:", error);
    throw error;
  }
};

// Permanently Delete Colors
export const deleteColor = async (colorId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_COLORS_COLLECTION_ID!,
      colorId
    );

    revalidatePath("/products/colors");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting color:", error);
    throw error;
  }
};

// Soft Delete Colors
export const softDeleteColor = async (colorId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_COLORS_COLLECTION_ID!,
      colorId,
      { isActive: false }
    );

    revalidatePath("/products/colors");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting color:", error);
    throw error;
  }
};
