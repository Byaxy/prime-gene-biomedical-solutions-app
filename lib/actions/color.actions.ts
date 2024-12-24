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
export const getColors = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_COLORS_COLLECTION_ID!,
      [Query.equal("isActive", true), Query.orderDesc("$createdAt")]
    );

    return parseStringify(response.documents);
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
