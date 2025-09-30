"use server";

import {
  purchaseOrderItemsTable,
  purchaseOrdersTable,
  vendorsTable,
} from "@/drizzle/schema";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { PurchaseOrderFormValues } from "../validation";
import { PurchaseStatus } from "@/types";
import { db } from "@/drizzle/db";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { PurchaseOrderFilters } from "@/hooks/usePurchaseOrders";

const buildFilterConditions = (filters: PurchaseOrderFilters) => {
  const conditions = [];

  conditions.push(eq(purchaseOrdersTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(purchaseOrdersTable.purchaseOrderNumber, searchTerm),
        ilike(vendorsTable.name, searchTerm)
      )
    );
  }

  // Total Amount range
  if (filters.totalAmount_min !== undefined) {
    conditions.push(
      gte(purchaseOrdersTable.totalAmount, filters.totalAmount_min)
    );
  }
  if (filters.totalAmount_max !== undefined) {
    conditions.push(
      lte(purchaseOrdersTable.totalAmount, filters.totalAmount_max)
    );
  }

  // Sale date range
  if (filters.purchaseOrderDate_start) {
    conditions.push(
      gte(
        purchaseOrdersTable.purchaseOrderDate,
        new Date(filters.purchaseOrderDate_start)
      )
    );
  }
  if (filters.purchaseOrderDate_end) {
    conditions.push(
      lte(
        purchaseOrdersTable.purchaseOrderDate,
        new Date(filters.purchaseOrderDate_end)
      )
    );
  }

  // Status filter
  if (filters.status) {
    conditions.push(
      eq(purchaseOrdersTable.status, filters.status as PurchaseStatus)
    );
  }

  // Converted to sale filter
  if (filters.isConvertedToPurchase !== undefined) {
    conditions.push(
      eq(
        purchaseOrdersTable.isConvertedToPurchase,
        filters.isConvertedToPurchase
      )
    );
  }

  return conditions;
};

// Add Purchase Order
export const addPurchaseOrder = async (
  purchaseOrder: PurchaseOrderFormValues
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create main purchase order record
      const [newPurchaseOrder] = await tx
        .insert(purchaseOrdersTable)
        .values({
          purchaseOrderNumber: purchaseOrder.purchaseOrderNumber,
          purchaseOrderDate: purchaseOrder.purchaseOrderDate,
          totalAmount: purchaseOrder.totalAmount,
          vendorId: purchaseOrder.vendorId,
          status: purchaseOrder.status as PurchaseStatus,
          notes: purchaseOrder.notes,
        })
        .returning();

      // Create purchase items
      const purchaseItems = await Promise.all(
        purchaseOrder.products.map(async (product) => {
          const [newItem] = await tx
            .insert(purchaseOrderItemsTable)
            .values({
              purchaseOrderId: newPurchaseOrder.id,
              productId: product.productId,
              quantity: product.quantity,
              costPrice: product.costPrice,
              totalPrice: product.totalPrice,
              productName: product.productName,
              productID: product.productID,
            })
            .returning();
          return newItem;
        })
      );

      return { purchase: newPurchaseOrder, items: purchaseItems };
    });

    revalidatePath("/purchases/purchase-orders");
    return parseStringify(result);
  } catch (error) {
    console.error("Error creating purchase order:", error);
    throw error;
  }
};

// edit purchase Order
export const editPurchaseOrder = async (
  purchase: PurchaseOrderFormValues,
  purchaseId: string
) => {
  try {
    const updatedPurchase = await db.transaction(async (tx) => {
      // Update the main purchase record
      const [updatedPurchase] = await tx
        .update(purchaseOrdersTable)
        .set({
          purchaseOrderNumber: purchase.purchaseOrderNumber,
          purchaseOrderDate: purchase.purchaseOrderDate,
          totalAmount: purchase.totalAmount,
          vendorId: purchase.vendorId,
          status: purchase.status as PurchaseStatus,
          notes: purchase.notes,
        })
        .where(eq(purchaseOrdersTable.id, purchaseId))
        .returning();

      // Get the existing purchase and items
      const [existingPurchase] = await tx
        .select()
        .from(purchaseOrdersTable)
        .where(eq(purchaseOrdersTable.id, purchaseId));

      if (!existingPurchase) throw new Error("Purchase order not found");

      // Get existing quotation items
      const existingItems = await tx
        .select()
        .from(purchaseOrderItemsTable)
        .where(eq(purchaseOrderItemsTable.purchaseOrderId, purchaseId));

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
              .delete(purchaseOrderItemsTable)
              .where(eq(purchaseOrderItemsTable.id, item.id))
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
              .update(purchaseOrderItemsTable)
              .set({
                quantity: product.quantity,
                totalPrice: product.totalPrice,
                costPrice: product.costPrice,
              })
              .where(eq(purchaseOrderItemsTable.id, existingItem.id))
              .returning();
            return updatedItem;
          } else {
            // Create new item
            const [newItem] = await tx
              .insert(purchaseOrderItemsTable)
              .values({
                purchaseOrderId: purchaseId,
                productId: product.productId,
                quantity: product.quantity,
                totalPrice: product.totalPrice,
                costPrice: product.costPrice,
                productName: product.productName,
                productID: product.productID,
              })
              .returning();
            return newItem;
          }
        })
      );

      return {
        purchase: updatedPurchase,
        items: updatedItems,
      };
    });

    revalidatePath("/purchases/purchase-orders");
    revalidatePath(`/purchases/edit-purchase-order/${purchaseId}`);
    return updatedPurchase;
  } catch (error) {
    console.error("Error updating purchase order:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update purchase order"
    );
  }
};

// get purchase by id
export const getPurchaseOrderById = async (purchaseId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main purchase order record
      const purchase = await tx
        .select({
          purchaseOrder: purchaseOrdersTable,
          vendor: vendorsTable,
        })
        .from(purchaseOrdersTable)
        .leftJoin(
          vendorsTable,
          eq(purchaseOrdersTable.vendorId, vendorsTable.id)
        )
        .where(
          and(
            eq(purchaseOrdersTable.id, purchaseId),
            eq(purchaseOrdersTable.isActive, true)
          )
        )
        .then((res) => res[0]);

      if (!purchase) {
        return null;
      }

      // Get all items for this purchase order
      const items = await tx
        .select()
        .from(purchaseOrderItemsTable)
        .where(
          and(
            eq(purchaseOrderItemsTable.purchaseOrderId, purchaseId),
            eq(purchaseOrderItemsTable.isActive, true)
          )
        );

      // Combine the data
      const purchaseOrderWithItems = {
        ...purchase,
        products: items.map((item) => ({
          ...item,
        })),
      };

      return purchaseOrderWithItems;
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting purchase order:", error);
    throw error;
  }
};

// get all purchase orders
export const getPurchaseOrders = async (
  page: number = 0,
  limit: number = 10,
  getAllPurchaseOrders: boolean = false,
  filters?: PurchaseOrderFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main purchases (all or paginated)
      let purchasesQuery = tx
        .select({
          purchaseOrder: purchaseOrdersTable,
          vendor: vendorsTable,
        })
        .from(purchaseOrdersTable)
        .leftJoin(
          vendorsTable,
          eq(purchaseOrdersTable.vendorId, vendorsTable.id)
        )
        .$dynamic();

      const conditions = await buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        purchasesQuery = purchasesQuery.where(and(...conditions));
      }

      purchasesQuery = purchasesQuery.orderBy(
        desc(purchaseOrdersTable.createdAt)
      );

      if (!getAllPurchaseOrders && limit > 0) {
        purchasesQuery.limit(limit).offset(page * limit);
      }

      const purchases = await purchasesQuery;

      // Get all items for these purchase orders in a single query
      const purchaseIds = purchases.map((q) => q.purchaseOrder.id);
      const items = await tx
        .select()
        .from(purchaseOrderItemsTable)
        .where(
          and(
            inArray(purchaseOrderItemsTable.purchaseOrderId, purchaseIds),
            eq(purchaseOrderItemsTable.isActive, true)
          )
        );

      // Combine the data
      const purchaseOrdersWithItems = purchases.map((purchase) => ({
        ...purchase,
        products: items
          .filter((item) => item.purchaseOrderId === purchase.purchaseOrder.id)
          .map((item) => ({
            ...item,
          })),
      }));

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(purchaseOrdersTable)
        .leftJoin(
          vendorsTable,
          eq(purchaseOrdersTable.vendorId, vendorsTable.id)
        )
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllPurchaseOrders
        ? purchaseOrdersWithItems.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: purchaseOrdersWithItems,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting purchase orders:", error);
    throw error;
  }
};

// permanently delete purchase order
export const deletePurchaseOrder = async (purchaseId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Delete purchase items first
      await tx
        .delete(purchaseOrderItemsTable)
        .where(eq(purchaseOrderItemsTable.purchaseOrderId, purchaseId));

      // Delete the main purchase record
      const [deletedPurchase] = await tx
        .delete(purchaseOrdersTable)
        .where(eq(purchaseOrdersTable.id, purchaseId))
        .returning();

      return deletedPurchase;
    });

    revalidatePath("/purchases/purchase-orders");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    throw error;
  }
};

// softe delete purchase order
export const softDeletePurchaseOrder = async (purchaseId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      await tx
        .update(purchaseOrderItemsTable)
        .set({ isActive: false })
        .where(eq(purchaseOrderItemsTable.purchaseOrderId, purchaseId));

      const [updatedPurchase] = await tx
        .update(purchaseOrdersTable)
        .set({ isActive: false })
        .where(eq(purchaseOrdersTable.id, purchaseId))
        .returning();

      return updatedPurchase;
    });

    revalidatePath("/purchases/purchase-orders");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting purchase:", error);
    throw error;
  }
};

// Generate Purchase Order number
export const generatePurchaseOrderNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastPurchaseOrder = await tx
        .select({
          purchaseOrderNumber: purchaseOrdersTable.purchaseOrderNumber,
        })
        .from(purchaseOrdersTable)
        .where(sql`purchase_order_number LIKE ${`PO-${year}/${month}/%`}`)
        .orderBy(desc(purchaseOrdersTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastPurchaseOrder.length > 0) {
        const lastPurchaseOrderNumber =
          lastPurchaseOrder[0].purchaseOrderNumber;
        const lastSequence = parseInt(
          lastPurchaseOrderNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `PO-${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating purchase order number:", error);
    throw error;
  }
};
