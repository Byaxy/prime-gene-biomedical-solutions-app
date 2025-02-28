"use server";

import { ID, Query, Models } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_QUOTATIONS_COLLECTION_ID,
  NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID,
} from "../appwrite-server";
import { QuotationFormValues } from "../validation";

// Quotation item document interface
interface QuotationItemDocument extends Models.Document {
  quotation: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// add quotation
export const addQuotation = async (quotation: QuotationFormValues) => {
  try {
    // Create quotation
    const quotationData = {
      quotationNumber: quotation.quotationNumber,
      quotationDate: quotation.quotationDate,
      totalAmount: quotation.totalAmount,
      amountPaid: quotation.amountPaid,
      customer: quotation.customer,
      status: quotation.status,
      notes: quotation.notes,
    };
    const createQuotationResponse = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_QUOTATIONS_COLLECTION_ID!,
      ID.unique(),
      quotationData
    );

    // Create quotation items
    const createQuotationItemsPromises = quotation.products.map(
      async (product) => {
        const quotationItemData = {
          quotation: createQuotationResponse.$id,
          product: product.product,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          totalPrice: product.totalPrice,
        };

        return databases.createDocument(
          DATABASE_ID!,
          NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID!,
          ID.unique(),
          quotationItemData
        );
      }
    );

    const response = await Promise.all(createQuotationItemsPromises);

    revalidatePath("/quotations");
    return parseStringify(response);
  } catch (error) {
    console.error("Error creating quotation:", error);
    throw error;
  }
};

// edit quotation
export const editQuotation = async (
  quotation: QuotationFormValues,
  quotationId: string
) => {
  try {
    // Update main quotation record
    const quotationData = {
      quotationNumber: quotation.quotationNumber,
      quotationDate: quotation.quotationDate,
      totalAmount: quotation.totalAmount,
      amountPaid: quotation.amountPaid,
      customer: quotation.customer,
      status: quotation.status,
      notes: quotation.notes,
    };

    // Get existing quotation items first
    const existingItems = await databases.listDocuments<QuotationItemDocument>(
      DATABASE_ID!,
      NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID!,
      [Query.equal("quotation", quotationId)]
    );

    const newProductIds = new Set(
      quotation.products.map((product) => product.product)
    );

    // Find items to delete (exist in database but not in new products)
    const itemsToDelete = existingItems.documents.filter(
      (item) => !newProductIds.has(item.productId)
    );

    // Delete removed items first
    if (itemsToDelete.length > 0) {
      await Promise.all(
        itemsToDelete.map((item) =>
          databases.deleteDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID!,
            item.$id
          )
        )
      );
    }

    // Create a map of existing items for updates
    const existingItemsMap = new Map(
      existingItems.documents.map((item) => [item.product, item])
    );

    // Handle updates and additions after deletions are complete
    await Promise.all(
      quotation.products.map(async (product) => {
        const existingItem = existingItemsMap.get(product.product);
        const quotationItemData = {
          quotation: quotationId,
          product: product.product,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          totalPrice: product.totalPrice,
        };

        if (existingItem) {
          // Update existing item
          return databases.updateDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID!,
            existingItem.$id,
            quotationItemData
          );
        } else {
          // Create new item
          return databases.createDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID!,
            ID.unique(),
            quotationItemData
          );
        }
      })
    );

    // Update the main quotation record after all item operations are complete
    const updateQuotationResponse = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_QUOTATIONS_COLLECTION_ID!,
      quotationId,
      quotationData
    );

    revalidatePath("/quotations");
    return parseStringify(updateQuotationResponse);
  } catch (error) {
    console.error("Error updating quotation:", error);
    throw error;
  }
};

// get all quotations
export const getQuotations = async (
  page: number = 0,
  limit: number = 10,
  getAllQuotations: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllQuotations) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));

      const response = await databases.listDocuments(
        DATABASE_ID!,
        NEXT_PUBLIC_QUOTATIONS_COLLECTION_ID!,
        queries
      );

      // Get quotation items for each quotation
      const quotationsWithItems = await Promise.all(
        response.documents.map(async (quotation) => {
          const items = await databases.listDocuments(
            DATABASE_ID!,
            NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID!,
            [Query.equal("quotation", quotation.$id)]
          );

          return {
            ...quotation,
            products: items.documents,
          };
        })
      );

      return {
        documents: parseStringify(quotationsWithItems),
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
          NEXT_PUBLIC_QUOTATIONS_COLLECTION_ID!,
          batchQueries
        );

        // Get quotation items for each quotation
        const quotationsWithItems = await Promise.all(
          response.documents.map(async (quotation) => {
            const items = await databases.listDocuments(
              DATABASE_ID!,
              NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID!,
              [Query.equal("quotation", quotation.$id)]
            );

            return {
              ...quotation,
              products: items.documents,
            };
          })
        );

        allDocuments = [...allDocuments, ...quotationsWithItems];

        // If we got fewer documents than the batch size, we've reached the end
        if (quotationsWithItems.length < batchSize) {
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
    console.error("Error getting quotations:", error);
    throw error;
  }
};

// permanently delete quotation
export const deleteQuotation = async (quotationId: string) => {
  try {
    // Get existing quotation items first
    const existingItems = await databases.listDocuments<QuotationItemDocument>(
      DATABASE_ID!,
      NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID!,
      [Query.equal("quotation", quotationId)]
    );

    // Delete quotation items first
    await Promise.all(
      existingItems.documents.map((item) =>
        databases.deleteDocument(
          DATABASE_ID!,
          NEXT_PUBLIC_QUOTATION_ITEMS_COLLECTION_ID!,
          item.$id
        )
      )
    );

    // Delete the main quotation record
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_QUOTATIONS_COLLECTION_ID!,
      quotationId
    );

    revalidatePath("/quotations");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting quotation:", error);
    throw error;
  }
};
