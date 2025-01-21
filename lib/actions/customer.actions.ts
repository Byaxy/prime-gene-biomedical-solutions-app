"use server";

import { ID, Query } from "node-appwrite";
import {
  DATABASE_ID,
  databases,
  NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID,
} from "../appwrite-server";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { CustomerFormValues } from "../validation";

// Get Customers
export const getCustomers = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!,
      [Query.equal("isActive", true), Query.orderDesc("$createdAt")]
    );

    return parseStringify(response.documents);
  } catch (error) {
    console.error("Error getting customers:", error);
    throw error;
  }
};

// Add Customer
export const addCustomer = async (customerData: CustomerFormValues) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!,
      ID.unique(),
      customerData
    );

    revalidatePath("/customers");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};

// Edit Customers
export const editCustomer = async (
  customerData: CustomerFormValues,
  customerId: string
) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!,
      customerId,
      customerData
    );

    revalidatePath("/customers");
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing customer:", error);
    throw error;
  }
};

// Permanently Delete Customers
export const deleteCustomer = async (customerId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!,
      customerId
    );

    revalidatePath("/customers");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
};

// Soft Delete Customers
export const softDeleteCustomer = async (customerId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!,
      customerId,
      { isActive: false }
    );

    revalidatePath("/customers");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting customer:", error);
    throw error;
  }
};
