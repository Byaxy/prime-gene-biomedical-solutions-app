"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_PRODUCTS_COLLECTION_ID,
} from "../appwrite-server";
import { ProductFormValues } from "../validation";

// Add Product
export const addProduct = async (productData: ProductFormValues) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
      ID.unique(),
      productData
    );

    revalidatePath("/products");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

// Get Product
export const getProductById = async (productId: string) => {
  try {
    const response = await databases.getDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
      productId
    );

    return parseStringify(response);
  } catch (error) {
    console.error("Error getting product:", error);
    throw error;
  }
};

// Get Products
export const getProducts = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
      [Query.equal("isActive", true), Query.orderDesc("$createdAt")]
    );

    return parseStringify(response.documents);
  } catch (error) {
    console.error("Error getting products:", error);
    throw error;
  }
};

// Edit Product
export const editProduct = async (
  productData: ProductFormValues,
  productId: string
) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
      productId,
      productData
    );

    revalidatePath("/products");
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing product:", error);
    throw error;
  }
};

// Permanently Delete Product
export const deleteProduct = async (productId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
      productId
    );

    revalidatePath("/products");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

// Soft Delete Product
export const softDeleteProduct = async (productId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
      productId,
      { isActive: false }
    );

    revalidatePath("/products");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting product:", error);
    throw error;
  }
};
