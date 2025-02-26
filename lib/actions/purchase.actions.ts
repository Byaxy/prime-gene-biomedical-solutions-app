"use server";

import { ID, Query, Models } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import {
  databases,
  DATABASE_ID,
  NEXT_PUBLIC_PURCHASES_COLLECTION_ID,
  NEXT_PUBLIC_PURCHASE_ITEMS_COLLECTION_ID,
  NEXT_PUBLIC_PRODUCTS_COLLECTION_ID,
} from "../appwrite-server";
import { PurchaseFormValues } from "../validation";

// Purchase item document interface
interface PurchaseItemDocument extends Models.Document {
  purchaseId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// add purchase
export const addPurchase = async (purchase: PurchaseFormValues) => {
  try {
    // Create purchase
    const purchaseData = {
      purchaseOrderNumber: purchase.purchaseOrderNumber,
      purchaseDate: purchase.purchaseDate,
      totalAmount: purchase.totalAmount,
      amountPaid: purchase.amountPaid,
      supplier: purchase.supplier,
      status: purchase.status,
      paymentMethod: purchase.paymentMethod,
      deliveryStatus: purchase.deliveryStatus,
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
          purchase: createPurchaseResponse.$id,
          product: product.productId,
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

    // Adjust product stock if delivery status is delivered
    if (purchase.deliveryStatus === "delivered") {
      await Promise.all(
        purchase.products.map(async (product) => {
          const productData = await databases.getDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
            product.productId
          );

          const updatedStock = productData.quantity + product.quantity;

          // TO DO: Alert if stock is more than max stock level

          return databases.updateDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
            product.productId,
            {
              quantity: updatedStock,
            }
          );
        })
      );
    }

    revalidatePath("/purchases");
    return parseStringify(response);
  } catch (error) {
    console.error("Error creating purchase:", error);
    throw error;
  }
};

// edit purchase
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
      supplier: purchase.supplier,
      status: purchase.status,
      paymentMethod: purchase.paymentMethod,
      deliveryStatus: purchase.deliveryStatus,
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
          purchase: purchaseId,
          product: product.productId,
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

    // Adjust product stock if delivery status is delivered
    const existingPurchase = await databases.getDocument(
      DATABASE_ID!,
      NEXT_PUBLIC_PURCHASES_COLLECTION_ID!,
      purchaseId
    );

    if (
      purchase.deliveryStatus === "delivered" &&
      existingPurchase.deliveryStatus !== "delivered"
    ) {
      await Promise.all(
        purchase.products.map(async (product) => {
          const productData = await databases.getDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
            product.productId
          );

          const updatedStock = productData.quantity + product.quantity;

          // TO DO: Alert if stock is more than max stock level

          return databases.updateDocument(
            DATABASE_ID!,
            NEXT_PUBLIC_PRODUCTS_COLLECTION_ID!,
            product.productId,
            {
              quantity: updatedStock,
            }
          );
        })
      );
    }

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

// get all purchases
export const getPurchases = async (
  page: number = 0,
  limit: number = 10,
  getAllPurchases: boolean = false
) => {
  try {
    const queries = [
      Query.equal("isActive", true),
      Query.orderDesc("$createdAt"),
    ];

    if (!getAllPurchases) {
      queries.push(Query.limit(limit));
      queries.push(Query.offset(page * limit));

      const response = await databases.listDocuments(
        DATABASE_ID!,
        NEXT_PUBLIC_PURCHASES_COLLECTION_ID!,
        queries
      );

      // Get purchase items for each purchase
      const purchasesWithItems = await Promise.all(
        response.documents.map(async (purchase) => {
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

      return {
        documents: parseStringify(purchasesWithItems),
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
          NEXT_PUBLIC_PURCHASES_COLLECTION_ID!,
          batchQueries
        );

        // Get purchase items for each purchase
        const purchasesWithItems = await Promise.all(
          response.documents.map(async (purchase) => {
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

        allDocuments = [...allDocuments, ...purchasesWithItems];

        // If we got fewer documents than the batch size, we've reached the end
        if (purchasesWithItems.length < batchSize) {
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
    console.error("Error getting purchases:", error);
    throw error;
  }
};

// permanently delete purchase
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

// softe delete purchase
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
