"use server";

import { ID, Query, Models } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_PURCHASES_COLLECTION_ID,
  NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID,
} from "../appwrite-server";
import { PurchaseFormValues } from "../validation";

export const addPurchase = async (purchase: PurchaseFormValues) => {
  try {
    // Create purchase
    const purchaseData = {
      purchaseOrderNumber: purchase.purchaseOrderNumber,
      purchaseDate: purchase.purchaseDate,
      totalAmount: purchase.totalAmount,
      amountPaid: purchase.amountPaid,
      supplierId: purchase.supplierId,
      status: purchase.status,
      notes: purchase.notes,
    };
    const createPurchaseResponse = await databases.createDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PURCHASES_COLLECTION_ID!,
      ID.unique(),
      purchaseData
    );

    // Create purchase items
    const createPurchaseItemsPromises = purchase.products.map(
      async (product) => {
        const purchaseItemData = {
          purchaseId: createPurchaseResponse.$id,
          productId: product.productId,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          totalPrice: product.totalPrice,
        };

        return databases.createDocument(
          DATABASE_ID!,
          NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID!,
          ID.unique(),
          purchaseItemData
        );
      }
    );

    const response = await Promise.all(createPurchaseItemsPromises);

    revalidatePath("/purchases");
    return parseStringify(response);
  } catch (error) {
    console.error("Error creating purchase:", error);
    throw error;
  }
};

// Define interface for purchase item document
interface PurchaseItemDocument extends Models.Document {
  purchaseId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export const editPurchase = async (
  purchase: PurchaseFormValues,
  purchaseId: string
) => {
  try {
    // Update main purchase record
    const purchaseData = {
      purchaseOrderNumber: purchase.purchaseOrderNumber,
      purchaseDate: purchase.purchaseDate,
      totalAmount: purchase.totalAmount,
      amountPaid: purchase.amountPaid,
      supplierId: purchase.supplierId,
      status: purchase.status,
      notes: purchase.notes,
    };

    // Get existing purchase items first
    const existingItems = await databases.listDocuments<PurchaseItemDocument>(
      DATABASE_ID!,
      NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID!,
      [Query.equal("purchaseId", purchaseId)]
    );

    const newProductIds = new Set(
      purchase.products.map((product) => product.productId)
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
            NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID!,
            item.$id
          )
        )
      );
    }

    // Create a map of existing items for updates
    const existingItemsMap = new Map(
      existingItems.documents.map((item) => [item.productId, item])
    );

    // Handle updates and additions after deletions are complete
    await Promise.all(
      purchase.products.map(async (product) => {
        const existingItem = existingItemsMap.get(product.productId);
        const purchaseItemData = {
          purchaseId,
          productId: product.productId,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          totalPrice: product.totalPrice,
        };

        if (existingItem) {
          // Update existing item
          return databases.updateDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID!,
            existingItem.$id,
            purchaseItemData
          );
        } else {
          // Create new item
          return databases.createDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID!,
            ID.unique(),
            purchaseItemData
          );
        }
      })
    );

    // Update the main purchase record after all item operations are complete
    const updatePurchaseResponse = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PURCHASES_COLLECTION_ID!,
      purchaseId,
      purchaseData
    );

    revalidatePath("/purchases");
    return parseStringify(updatePurchaseResponse);
  } catch (error) {
    console.error("Error updating purchase:", error);
    throw error;
  }
};

export const getPurchases = async () => {
  try {
    // Get all purchases
    const purchasesResponse = await databases.listDocuments(
      DATABASE_ID!,
      NEXT_PUBLIC_PURCHASES_COLLECTION_ID!,
      [Query.equal("isActive", true), Query.orderDesc("$createdAt")]
    );

    // Get purchase items for each purchase
    const purchasesWithItems = await Promise.all(
      purchasesResponse.documents.map(async (purchase) => {
        const items = await databases.listDocuments(
          DATABASE_ID!,
          NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID!,
          [Query.equal("purchaseId", purchase.$id)]
        );

        return {
          ...purchase,
          products: items.documents,
        };
      })
    );

    return parseStringify(purchasesWithItems);
  } catch (error) {
    console.error("Error getting purchases:", error);
    throw error;
  }
};

export const deletePurchase = async (purchaseId: string) => {
  try {
    // Get existing purchase items first
    const existingItems = await databases.listDocuments<PurchaseItemDocument>(
      DATABASE_ID!,
      NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID!,
      [Query.equal("purchaseId", purchaseId)]
    );

    // Delete purchase items first
    await Promise.all(
      existingItems.documents.map((item) =>
        databases.deleteDocument(
          DATABASE_ID!,
          NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID!,
          item.$id
        )
      )
    );

    // Delete the main purchase record
    const response = await databases.deleteDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PURCHASES_COLLECTION_ID!,
      purchaseId
    );

    revalidatePath("/purchases");
    return parseStringify(response);
  } catch (error) {
    console.error("Error deleting purchase:", error);
    throw error;
  }
};

export const softDeletePurchase = async (purchaseId: string) => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PURCHASES_COLLECTION_ID!,
      purchaseId,
      { isActive: false }
    );

    revalidatePath("/purchases");
    return parseStringify(response);
  } catch (error) {
    console.error("Error soft deleting purchase:", error);
    throw error;
  }
};
