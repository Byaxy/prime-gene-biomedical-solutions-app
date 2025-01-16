"use server";

import { ID, Query } from "node-appwrite";
import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_UNITS_COLLECTION_ID,
} from "../appwrite-server";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { UnitFormValues } from "../validation";

// Add Unit
export const addUnit = async (unitData: UnitFormValues) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_UNITS_COLLECTION_ID!,
      ID.unique(),
      unitData
    );

    revalidatePath("/products/units");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding unit:", error);
    throw error;
  }
};

// Get Units
export const getUnits = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_UNITS_COLLECTION_ID!,
      [Query.equal("isActive", true), Query.orderDesc("$createdAt")]
    );

    return parseStringify(response.documents);
  } catch (error) {
    console.error("Error getting units:", error);
    throw error;
  }
};

// Edit Unit
export const editUnit = async (unitData: UnitFormValues, unitId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_UNITS_COLLECTION_ID!,
      unitId,
      unitData
    );

    revalidatePath("/products/units");
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing unit:", error);
    throw error;
  }
};

// Permanently Delete Unit
export const deleteUnit = async (unitId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_UNITS_COLLECTION_ID!,
      unitId
    );

    revalidatePath("/products/units");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting unit:", error);
    throw error;
  }
};

// Soft Delete Unit
export const softDeleteUnit = async (unitId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_UNITS_COLLECTION_ID!,
      unitId,
      { isActive: false }
    );

    revalidatePath("/products/units");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting unit:", error);
    throw error;
  }
};
