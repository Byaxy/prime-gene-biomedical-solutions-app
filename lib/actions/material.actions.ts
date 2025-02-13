"use server";

import { ID, Query } from "node-appwrite";
import {
  DATABASE_ID,
  databases,
  NEXT_PUBLIC_MATERIAL_COLLECTION_ID,
} from "../appwrite-server";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { MaterialFormValues } from "../validation";

// Add Material
export const addMaterial = async (typeData: MaterialFormValues) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_MATERIAL_COLLECTION_ID!,
      ID.unique(),
      typeData
    );

    revalidatePath("/products/materials");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding material:", error);
    throw error;
  }
};

// Get Materials
export const getMaterials = async (
  page: number = 0,
  limit: number = 0,
  getAllMaterials: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllMaterials) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));
    }

    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_MATERIAL_COLLECTION_ID!,
      queries
    );

    return {
      documents: parseStringify(response.documents),
      total: response.total,
    };
  } catch (error) {
    console.error("Error getting materials:", error);
    throw error;
  }
};

// Edit Material
export const editMaterial = async (
  materialData: MaterialFormValues,
  materialId: string
) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_MATERIAL_COLLECTION_ID!,
      materialId,
      materialData
    );

    revalidatePath("/products/materials");
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing material:", error);
    throw error;
  }
};

// Permanently Delete Material
export const deleteMaterial = async (materialId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_MATERIAL_COLLECTION_ID!,
      materialId
    );

    revalidatePath("/products/materials");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting material:", error);
    throw error;
  }
};

// Soft Delete Material
export const softDeleteMaterial = async (materialId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_MATERIAL_COLLECTION_ID!,
      materialId,
      { isActive: false }
    );

    revalidatePath("/products/materials");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting material:", error);
    throw error;
  }
};
