"use server";

import { ID, Models, Query } from "node-appwrite";
import {
  DATABASE_ID,
  databases,
  NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID,
} from "../appwrite-server";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { CustomerFormValues } from "../validation";

// Get Customers
export const getCustomers = async (
  page: number = 0,
  limit: number = 10,
  getAllCustomers: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllCustomers) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));

      const response = await databases.listDocuments(
        DATABASE_ID!,
        NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!,
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
          NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!,
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
    console.error("Error getting customers:", error);
    throw error;
  }
};

// Get Single Customer
export const getCustomerById = async (customerId: string) => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!,
      customerId
    );

    console.log(response);
    return parseStringify(response);
  } catch (error) {
    console.error("Error getting customer:", error);
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
    revalidatePath(`/customers/edit-customer/${customerId}`);
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
