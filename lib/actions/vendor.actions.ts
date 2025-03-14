"use server";

import { ID, Models, Query } from "node-appwrite";
import {
  DATABASE_ID,
  databases,
  NEXT_PUBLIC_VENDORS_COLLECTION_ID,
} from "../appwrite-server";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { VendorFormValues } from "../validation";

// Get Vendors
export const getVendors = async (
  page: number = 0,
  limit: number = 10,
  getAllVendors: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllVendors) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));

      const response = await databases.listDocuments(
        DATABASE_ID!,
        NEXT_PUBLIC_VENDORS_COLLECTION_ID!,
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
          NEXT_PUBLIC_VENDORS_COLLECTION_ID!,
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
    console.error("Error getting vendors:", error);
    throw error;
  }
};

// Add Vendor
export const addVendor = async (vendorData: VendorFormValues) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_VENDORS_COLLECTION_ID!,
      ID.unique(),
      vendorData
    );

    revalidatePath("/vendors");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding vendor:", error);
    throw error;
  }
};

// Edit Vendors
export const editVendor = async (
  vendorData: VendorFormValues,
  vendorId: string
) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_VENDORS_COLLECTION_ID!,
      vendorId,
      vendorData
    );

    revalidatePath("/vendors");
    revalidatePath(`/vendors/edit-vendor/${vendorId}`);
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing vendor:", error);
    throw error;
  }
};

// Permanently Delete vendors
export const deleteVendor = async (vendorId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_VENDORS_COLLECTION_ID!,
      vendorId
    );

    revalidatePath("/vendors");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting vendor:", error);
    throw error;
  }
};

// Soft Delete vendors
export const softDeleteVendor = async (vendorId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_VENDORS_COLLECTION_ID!,
      vendorId,
      { isActive: false }
    );

    revalidatePath("/vendors");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting vendor:", error);
    throw error;
  }
};
