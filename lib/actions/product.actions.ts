"use server";

import { ID, Models, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_PRODUCTS_COLLECTION_ID,
} from "../appwrite-server";
import { ProductFormValues } from "../validation";

interface ProductDataWithImage extends Omit<ProductFormValues, "image"> {
  imageId: string;
  imageUrl: string;
}

// Add Product
export const addProduct = async (productData: ProductDataWithImage) => {
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

// Get Product by ID
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
export const getProducts = async (
  page: number = 0,
  limit: number = 10,
  getAllProducts: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllProducts) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));

      const response = await databases.listDocuments(
        DATABASE_ID!,
        NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
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
          NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
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
    console.error("Error getting products:", error);
    throw error;
  }
};

// Edit Product
export const editProduct = async (
  productData: ProductDataWithImage,
  productId: string
) => {
  let updatedProductData;

  if (productData.imageId && productData.imageUrl) {
    updatedProductData = {
      name: productData.name,
      costPrice: productData.costPrice,
      sellingPrice: productData.sellingPrice,
      quantity: productData.quantity,
      category: productData.category,
      brand: productData.brand,
      type: productData.type,
      unit: productData.unit,
      description: productData.description,
      imageId: productData.imageId,
      imageUrl: productData.imageUrl,
    };
  } else {
    updatedProductData = {
      name: productData.name,
      costPrice: productData.costPrice,
      sellingPrice: productData.sellingPrice,
      quantity: productData.quantity,
      category: productData.category,
      brand: productData.brand,
      type: productData.type,
      unit: productData.unit,
      description: productData.description,
    };
  }
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
      productId,
      updatedProductData
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
