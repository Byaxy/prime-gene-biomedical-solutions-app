"use server";

import { Query } from "node-appwrite";
import {
  DATABASE_ID,
  databases,
  NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID,
} from "../appwrite-server";
import { parseStringify } from "../utils";

// Get Suppliers
export const getSuppliers = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID!,
      [Query.equal("isActive", true), Query.orderDesc("$createdAt")]
    );

    return parseStringify(response.documents);
  } catch (error) {
    console.error("Error getting suppliers:", error);
    throw error;
  }
};
