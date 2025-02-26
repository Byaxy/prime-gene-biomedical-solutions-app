"use server";

import { ID, Models, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_BRANDS_COLLECTION_ID,
} from "../appwrite-server";
import { BrandFormValues } from "../validation";

interface BrandDataWithImage extends Omit<BrandFormValues, "image"> {
  imageId: string;
  imageUrl: string;
}

// Add Brand
export const addBrand = async (brandData: BrandDataWithImage) => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_BRANDS_COLLECTION_ID!,
      ID.unique(),
      brandData
    );

    revalidatePath("/products/brands");
    return parseStringify(response);
  } catch (error) {
    console.error("Error adding brand:", error);
    throw error;
  }
};

// Get Brands
export const getBrands = async (
  page: number = 0,
  limit: number = 10,
  getAllBrands: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllBrands) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));

      const response = await databases.listDocuments(
        DATABASE_ID!,
        NEXT_PUBLIC_BRANDS_COLLECTION_ID!,
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
          NEXT_PUBLIC_BRANDS_COLLECTION_ID!,
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
    console.error("Error getting brands:", error);
    throw error;
  }
};

// edit Brand
export const editBrand = async (brand: BrandDataWithImage, brandId: string) => {
  let updatedBrandData;

  if (brand.imageId && brand.imageUrl) {
    updatedBrandData = {
      name: brand.name,
      description: brand.description,
      imageId: brand.imageId,
      imageUrl: brand.imageUrl,
    };
  } else {
    updatedBrandData = { name: brand.name, description: brand.description };
  }
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_BRANDS_COLLECTION_ID!,
      brandId,
      updatedBrandData
    );

    revalidatePath("/products/brands");
    return parseStringify(response);
  } catch (error) {
    console.error("Error editing brand:", error);
    throw error;
  }
};

// Permanently Delete Brand
export const deleteBrand = async (brandId: string) => {
  try {
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_BRANDS_COLLECTION_ID!,
      brandId
    );

    revalidatePath("/products/brands");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting brand:", error);
    throw error;
  }
};

// Soft Delete Brand
export const softDeleteBrand = async (brandId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_BRANDS_COLLECTION_ID!,
      brandId,
      { isActive: false }
    );

    revalidatePath("/products/brands");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting brand:", error);
    throw error;
  }
};
