"use server";

import { ID, Query } from "node-appwrite";
import {
  DATABASE_ID,
  databases,
  NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID,
} from "../appwrite-server";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { SupplierFormValues } from "../validation";

// Get Suppliers
export const getSuppliers = async (
  page: number = 0,
  limit: number = 10,
  getAllSuppliers: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllSuppliers) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));
    }

    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID!,
      queries
    );

    return {
      documents: parseStringify(response.documents),
      total: response.total,
    };
  } catch (error) {
    console.error("Error getting suppliers:", error);
    throw error;
  }
};

// Add Supplier
export const addSupplier = async (supplierData: SupplierFormValues) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID!,
      ID.unique(),
      supplierData
    );

    revalidatePath("/suppliers");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding supplier:", error);
    throw error;
  }
};

// Edit Suppliers
export const editSupplier = async (
  supplierData: SupplierFormValues,
  supplierId: string
) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID!,
      supplierId,
      supplierData
    );

    revalidatePath("/suppliers");
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing supplier:", error);
    throw error;
  }
};

// Permanently Delete Suppliers
export const deleteSupplier = async (supplierId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID!,
      supplierId
    );

    revalidatePath("/suppliers");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting supplier:", error);
    throw error;
  }
};

// Soft Delete Suppliers
export const softDeleteSupplier = async (supplierId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID!,
      supplierId,
      { isActive: false }
    );

    revalidatePath("/suppliers");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting supplier:", error);
    throw error;
  }
};
