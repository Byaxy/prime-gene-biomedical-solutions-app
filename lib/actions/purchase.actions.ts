"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { PurchaseFormValues } from "../validation";
import { db } from "@/drizzle/db";
import {
  purchaseItemsTable,
  purchaseOrdersTable,
  purchasesTable,
  vendorsTable,
} from "@/drizzle/schema";
import { PurchaseStatus } from "@/types";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { PurchaseFilters } from "@/hooks/usePurchases";

// add purchase
export const addPurchase = async (purchase: PurchaseFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create main purchase order record
      const [newPurchase] = await tx
        .insert(purchasesTable)
        .values({
          purchaseNumber: purchase.purchaseNumber,
          vendorInvoiceNumber: purchase.vendorInvoiceNumber,
          purchaseDate: purchase.purchaseDate,
          totalAmount: purchase.totalAmount,
          amountPaid: purchase.amountPaid,
          vendorId: purchase.vendorId,
          purchaseOrderId: purchase.purchaseOrderId && purchase.purchaseOrderId, // Link to purchase order if provided
          status: purchase.status as PurchaseStatus,
          notes: purchase.notes,
          attachments: purchase.attachments,
        })
        .returning();

      // Create purchase items
      const purchaseItems = await Promise.all(
        purchase.products.map(async (product) => {
          const [newItem] = await tx
            .insert(purchaseItemsTable)
            .values({
              purchaseId: newPurchase.id,
              productId: product.productId,
              quantity: product.quantity,
              costPrice: product.costPrice,
              totalPrice: product.totalPrice,
              quantityReceived: product.quantityReceived,
              productName: product.productName,
              productID: product.productID,
            })
            .returning();
          return newItem;
        })
      );

      if (purchase.purchaseOrderId) {
        await tx
          .update(purchaseOrdersTable)
          .set({
            isConvertedToPurchase: true,
            status: PurchaseStatus.Completed,
          })
          .where(
            and(
              eq(purchaseOrdersTable.id, purchase.purchaseOrderId),
              eq(purchaseOrdersTable.isActive, true)
            )
          );
      }

      return { purchase: newPurchase, items: purchaseItems };
    });

    revalidatePath("/purchases");
    return parseStringify(result);
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
    const updatedPurchase = await db.transaction(async (tx) => {
      // Update the main purchase record
      const [updatedPurchase] = await tx
        .update(purchasesTable)
        .set({
          purchaseNumber: purchase.purchaseNumber,
          vendorInvoiceNumber: purchase.vendorInvoiceNumber,
          purchaseDate: purchase.purchaseDate,
          totalAmount: purchase.totalAmount,
          amountPaid: purchase.amountPaid,
          vendorId: purchase.vendorId,
          purchaseOrderId: purchase.purchaseOrderId && purchase.purchaseOrderId,
          status: purchase.status as PurchaseStatus,
          notes: purchase.notes,
          attachments: purchase.attachments,
        })
        .where(eq(purchasesTable.id, purchaseId))
        .returning();

      // Get the existing purchase and items
      const [existingPurchase] = await tx
        .select()
        .from(purchasesTable)
        .where(eq(purchasesTable.id, purchaseId));

      if (!existingPurchase) throw new Error("Purchase not found");

      // Get existing quotation items
      const existingItems = await tx
        .select()
        .from(purchaseItemsTable)
        .where(eq(purchaseItemsTable.purchaseId, purchaseId));

      const newProductIds = new Set(
        purchase.products.map((product) => product.productId)
      );

      // Find items to delete (exist in database but not in new products)
      const itemsToDelete = existingItems.filter(
        (item) => !newProductIds.has(item.productId)
      );

      // Delete removed items first
      if (itemsToDelete.length > 0) {
        await Promise.all(
          itemsToDelete.map((item) =>
            tx
              .delete(purchaseItemsTable)
              .where(eq(purchaseItemsTable.id, item.id))
          )
        );
      }

      // Create a map of existing items for updates
      const existingItemsMap = new Map(
        existingItems.map((item) => [item.productId, item])
      );

      // Process updates and additions
      const updatedItems = await Promise.all(
        purchase.products.map(async (product) => {
          const existingItem = existingItemsMap.get(product.productId);

          if (existingItem) {
            // Update existing item
            const [updatedItem] = await tx
              .update(purchaseItemsTable)
              .set({
                quantity: product.quantity,
                totalPrice: product.totalPrice,
                costPrice: product.costPrice,
              })
              .where(eq(purchaseItemsTable.id, existingItem.id))
              .returning();
            return updatedItem;
          } else {
            // Create new item
            const [newItem] = await tx
              .insert(purchaseItemsTable)
              .values({
                purchaseId: purchaseId,
                productId: product.productId,
                quantity: product.quantity,
                totalPrice: product.totalPrice,
                costPrice: product.costPrice,
                quantityReceived: product.quantityReceived,
                productName: product.productName,
                productID: product.productID,
              })
              .returning();
            return newItem;
          }
        })
      );

      if (purchase.purchaseOrderId) {
        await tx
          .update(purchaseOrdersTable)
          .set({
            isConvertedToPurchase: true,
            status: PurchaseStatus.Completed,
          })
          .where(
            and(
              eq(purchaseOrdersTable.id, purchase.purchaseOrderId),
              eq(purchaseOrdersTable.isActive, true)
            )
          );
      }

      return {
        purchase: updatedPurchase,
        items: updatedItems,
      };
    });

    revalidatePath("/purchases");
    revalidatePath(`/purchases/edit-purchase/${purchaseId}`);
    return updatedPurchase;
  } catch (error) {
    console.error("Error updating purchase:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update purchase"
    );
  }
};

// get purchase by id
export const getPurchaseById = async (purchaseId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main purchase record
      const purchase = await tx
        .select({
          purchase: purchasesTable,
          vendor: vendorsTable,
        })
        .from(purchasesTable)
        .leftJoin(vendorsTable, eq(purchasesTable.vendorId, vendorsTable.id))
        .where(
          and(
            eq(purchasesTable.id, purchaseId),
            eq(purchasesTable.isActive, true)
          )
        )
        .then((res) => res[0]);

      if (!purchase) {
        return null;
      }

      // Get all items for this purchase
      const items = await tx
        .select()
        .from(purchaseItemsTable)
        .where(
          and(
            eq(purchaseItemsTable.purchaseId, purchaseId),
            eq(purchaseItemsTable.isActive, true)
          )
        );

      // Combine the data
      const purchaseWithItems = {
        ...purchase,
        products: items.map((item) => ({
          ...item,
        })),
      };

      return purchaseWithItems;
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting purchase:", error);
    throw error;
  }
};

// get all purchases
export const getPurchases = async (
  page: number = 0,
  limit: number = 10,
  getAllPurchases: boolean = false,
  filters?: PurchaseFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main purchases (all or paginated)
      let purchasesQuery = tx
        .select({
          purchase: purchasesTable,
          vendor: vendorsTable,
        })
        .from(purchasesTable)
        .leftJoin(vendorsTable, eq(purchasesTable.vendorId, vendorsTable.id))
        .$dynamic();

      // Create conditions array
      const conditions = [eq(purchasesTable.isActive, true)];

      // Apply filters if provided
      if (filters) {
        // Total Amount range
        if (filters.totalAmount_min !== undefined) {
          conditions.push(
            gte(purchasesTable.totalAmount, filters.totalAmount_min)
          );
        }
        if (filters.totalAmount_max !== undefined) {
          conditions.push(
            lte(purchasesTable.totalAmount, filters.totalAmount_max)
          );
        }

        // Purchase date range
        if (filters.purchaseDate_start) {
          conditions.push(
            gte(
              purchasesTable.purchaseDate,
              new Date(filters.purchaseDate_start)
            )
          );
        }
        if (filters.purchaseDate_end) {
          conditions.push(
            lte(purchasesTable.purchaseDate, new Date(filters.purchaseDate_end))
          );
        }

        // Status filter
        if (filters.status) {
          conditions.push(
            eq(purchasesTable.status, filters.status as PurchaseStatus)
          );
        }
      }

      // Apply where conditions
      purchasesQuery = purchasesQuery.where(and(...conditions));

      // Apply order by
      purchasesQuery = purchasesQuery.orderBy(desc(purchasesTable.createdAt));

      if (!getAllPurchases) {
        purchasesQuery.limit(limit).offset(page * limit);
      }

      const purchases = await purchasesQuery;

      // Get all items for these purchases in a single query
      const purchaseIds = purchases.map((q) => q.purchase.id);
      const items = await tx
        .select()
        .from(purchaseItemsTable)
        .where(
          and(
            inArray(purchaseItemsTable.purchaseId, purchaseIds),
            eq(purchaseItemsTable.isActive, true)
          )
        );

      // Combine the data
      const purchasesWithItems = purchases.map((purchase) => ({
        ...purchase,
        products: items
          .filter((item) => item.purchaseId === purchase.purchase.id)
          .map((item) => ({
            ...item,
          })),
      }));

      // Get total count for pagination
      const total = getAllPurchases
        ? purchases.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(purchasesTable)
            .then((res) => res[0]?.count || 0);

      return {
        documents: purchasesWithItems,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting purchases:", error);
    throw error;
  }
};

// permanently delete purchase
export const deletePurchase = async (purchaseId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Delete purchase items first
      await tx
        .delete(purchaseItemsTable)
        .where(eq(purchaseItemsTable.purchaseId, purchaseId));

      // Delete the main purchase record
      const [deletedPurchase] = await tx
        .delete(purchasesTable)
        .where(eq(purchasesTable.id, purchaseId))
        .returning();

      return deletedPurchase;
    });

    revalidatePath("/purchases");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting purchase:", error);
    throw error;
  }
};

// softe delete purchase
export const softDeletePurchase = async (purchaseId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      await tx
        .update(purchaseItemsTable)
        .set({ isActive: false })
        .where(eq(purchaseItemsTable.purchaseId, purchaseId));

      const [updatedPurchase] = await tx
        .update(purchasesTable)
        .set({ isActive: false })
        .where(eq(purchasesTable.id, purchaseId))
        .returning();

      return updatedPurchase;
    });

    revalidatePath("/purchases");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting purchase:", error);
    throw error;
  }
};

// Generate Purchase Order number
export const generatePurchaseNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastPurchaseOrder = await tx
        .select({ purchaseNumber: purchasesTable.purchaseNumber })
        .from(purchasesTable)
        .where(sql`purchase_number LIKE ${`P-${year}/${month}/%`}`)
        .orderBy(desc(purchasesTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastPurchaseOrder.length > 0) {
        const lastPurchaseNumber = lastPurchaseOrder[0].purchaseNumber;
        const lastSequence = parseInt(
          lastPurchaseNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `P-${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating purchase number:", error);
    throw error;
  }
};
