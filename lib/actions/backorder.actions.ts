/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import {
  backordersTable,
  inventoryTable,
  inventoryTransactionsTable,
  productsTable,
  saleItemInventoryTable,
  saleItemsTable,
  customersTable,
  salesTable,
} from "@/drizzle/schema";
import { eq, and, sql, gte, lte, asc, gt, ilike, or } from "drizzle-orm";
import { BackorderWithRelations, InventoryTransactionType } from "@/types";

// --- Filters for Get Backorders ---
export interface BackorderFilters {
  search?: string;
  productId?: string;
  saleId?: string;
  customerId?: string;
  pendingQuantity_min?: number;
  pendingQuantity_max?: number;
  createdAt_start?: string;
  createdAt_end?: string;
}

// --- build filter conditions for backorders ---
const buildBackorderFilterConditions = (filters: BackorderFilters) => {
  const conditions = [];
  conditions.push(eq(backordersTable.isActive, true));

  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(productsTable.name, searchTerm),
        ilike(productsTable.productID, searchTerm),
        ilike(productsTable.description, searchTerm),
        ilike(salesTable.invoiceNumber, searchTerm),
        ilike(customersTable.name, searchTerm)
      )
    );
  }
  if (filters.productId) {
    conditions.push(eq(backordersTable.productId, filters.productId));
  }

  if (filters.saleId) {
    conditions.push(eq(saleItemsTable.saleId, filters.saleId));
  }
  if (filters.customerId) {
    conditions.push(eq(salesTable.customerId, filters.customerId));
  }
  if (filters.pendingQuantity_min !== undefined) {
    conditions.push(
      gte(backordersTable.pendingQuantity, filters.pendingQuantity_min)
    );
  }
  if (filters.pendingQuantity_max !== undefined) {
    conditions.push(
      lte(backordersTable.pendingQuantity, filters.pendingQuantity_max)
    );
  }
  if (filters.createdAt_start) {
    conditions.push(
      gte(backordersTable.createdAt, new Date(filters.createdAt_start))
    );
  }
  if (filters.createdAt_end) {
    conditions.push(
      lte(backordersTable.createdAt, new Date(filters.createdAt_end))
    );
  }

  return conditions;
};

// --- GET BACKORDERS with filtering and pagination ---
export const getBackorders = async (
  page: number = 0,
  limit: number = 10,
  getAllBackorders: boolean = false,
  filters?: BackorderFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      let query = tx
        .select({
          backorder: backordersTable,
          product: productsTable,
          saleItem: saleItemsTable,
          sale: salesTable,
          customer: customersTable,
        })
        .from(backordersTable)
        .leftJoin(
          productsTable,
          and(
            eq(backordersTable.productId, productsTable.id),
            eq(productsTable.isActive, true)
          )
        )
        .leftJoin(
          saleItemsTable,
          and(
            eq(backordersTable.saleItemId, saleItemsTable.id),
            eq(saleItemsTable.isActive, true)
          )
        )
        .leftJoin(
          salesTable,
          and(
            eq(saleItemsTable.saleId, salesTable.id),
            eq(salesTable.isActive, true)
          )
        )
        .leftJoin(
          customersTable,
          and(
            eq(salesTable.customerId, customersTable.id),
            eq(customersTable.isActive, true)
          )
        )
        .$dynamic();

      // Apply filters
      const conditions = buildBackorderFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(asc(backordersTable.createdAt));

      // Apply pagination
      if (!getAllBackorders && limit > 0) {
        query = query.limit(limit).offset(page * limit);
      }

      const rawBackorders = await query;

      const backordersWithRelations: BackorderWithRelations[] =
        rawBackorders.map((row) => ({
          backorder: row.backorder,
          product: row.product,
          saleItem: row.saleItem
            ? {
                saleItem: row.saleItem,
                sale: row.sale
                  ? {
                      sale: row.sale,
                      customer: row.customer,
                    }
                  : null,
              }
            : null,
        }));

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(backordersTable)
        .leftJoin(
          productsTable,
          and(
            eq(backordersTable.productId, productsTable.id),
            eq(productsTable.isActive, true)
          )
        )
        .leftJoin(
          saleItemsTable,
          and(
            eq(backordersTable.saleItemId, saleItemsTable.id),
            eq(saleItemsTable.isActive, true)
          )
        )
        .leftJoin(
          salesTable,
          and(
            eq(saleItemsTable.saleId, salesTable.id),
            eq(salesTable.isActive, true)
          )
        )
        .leftJoin(
          customersTable,
          and(
            eq(salesTable.customerId, customersTable.id),
            eq(customersTable.isActive, true)
          )
        )
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllBackorders
        ? backordersWithRelations.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: backordersWithRelations,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting backorders:", error);
    throw error;
  }
};

// --- GET BACKORDER BY ID with relations ---
export const getBackorderById = async (backorderId: string) => {
  try {
    const rawBackorder = await db
      .select({
        backorder: backordersTable,
        product: productsTable,
        saleItem: saleItemsTable,
        sale: salesTable,
        customer: customersTable,
      })
      .from(backordersTable)
      .leftJoin(
        productsTable,
        and(
          eq(backordersTable.productId, productsTable.id),
          eq(productsTable.isActive, true)
        )
      )
      .leftJoin(
        saleItemsTable,
        and(
          eq(backordersTable.saleItemId, saleItemsTable.id),
          eq(saleItemsTable.isActive, true)
        )
      )
      .leftJoin(
        salesTable,
        and(
          eq(saleItemsTable.saleId, salesTable.id),
          eq(salesTable.isActive, true)
        )
      )
      .leftJoin(
        customersTable,
        and(
          eq(salesTable.customerId, customersTable.id),
          eq(customersTable.isActive, true)
        )
      )
      .where(eq(backordersTable.id, backorderId))
      .then((res) => res[0]);

    if (!rawBackorder) {
      return null;
    }

    const backorderWithRelations: BackorderWithRelations = {
      backorder: rawBackorder.backorder,
      product: rawBackorder.product,
      saleItem: rawBackorder.saleItem
        ? {
            saleItem: rawBackorder.saleItem,
            sale: rawBackorder.sale
              ? {
                  sale: rawBackorder.sale,
                  customer: rawBackorder.customer,
                }
              : null,
          }
        : null,
    };

    return parseStringify(backorderWithRelations);
  } catch (error) {
    console.error("Error getting backorder by ID:", error);
    throw error;
  }
};

// --- Fulfill a specific backorder ---
export const fulfillSingleBackorder = async (
  backorderId: string,
  inventoryStockId: string,
  userId: string,
  quantityToFulfill?: number
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Fetch the backorder and inventory stock, locking them for update
      const [backorder] = await tx
        .select()
        .from(backordersTable)
        .where(
          and(
            eq(backordersTable.id, backorderId),
            eq(backordersTable.isActive, true),
            gt(backordersTable.pendingQuantity, 0)
          )
        )
        .for("update");

      if (!backorder) {
        throw new Error("Backorder not found or already fulfilled.");
      }

      const [inventoryStock] = await tx
        .select()
        .from(inventoryTable)
        .where(
          and(
            eq(inventoryTable.id, inventoryStockId),
            eq(inventoryTable.isActive, true),
            gt(inventoryTable.quantity, 0)
          )
        )
        .for("update");

      if (!inventoryStock) {
        throw new Error("Inventory stock not found or not available.");
      }

      // Basic consistency checks
      if (
        inventoryStock.productId !== backorder.productId ||
        inventoryStock.storeId !== backorder.storeId
      ) {
        throw new Error(
          "Inventory stock does not match product or store of the backorder."
        );
      }

      // Determine the actual quantity to fulfill
      const quantityToAttemptFulfill =
        quantityToFulfill !== undefined && quantityToFulfill > 0
          ? Math.min(quantityToFulfill, backorder.pendingQuantity)
          : backorder.pendingQuantity;

      const actualQuantityFulfilling = Math.min(
        quantityToAttemptFulfill,
        inventoryStock.quantity
      );

      if (actualQuantityFulfilling <= 0) {
        throw new Error(
          "No available stock or requested quantity is zero for fulfillment."
        );
      }

      // Update Backorder
      const newBackorderPendingQuantity =
        backorder.pendingQuantity - actualQuantityFulfilling;
      await tx
        .update(backordersTable)
        .set({
          pendingQuantity: newBackorderPendingQuantity,
          isActive: newBackorderPendingQuantity > 0,
          updatedAt: new Date(),
        })
        .where(eq(backordersTable.id, backorderId));

      // Update Sale Item (parent of backorder)
      const [saleItem] = await tx
        .select()
        .from(saleItemsTable)
        .where(eq(saleItemsTable.id, backorder.saleItemId))
        .for("update");

      if (!saleItem) {
        throw new Error(
          `Sale item with ID ${backorder.saleItemId} not found for backorder.`
        );
      }

      const newSaleItemBackorderQuantity =
        saleItem.backorderQuantity - actualQuantityFulfilling;

      await tx
        .update(saleItemsTable)
        .set({
          backorderQuantity: newSaleItemBackorderQuantity,
          hasBackorder: newSaleItemBackorderQuantity > 0,
          updatedAt: new Date(),
        })
        .where(eq(saleItemsTable.id, saleItem.id));

      // Insert into saleItemInventoryTable to link the sale item to the specific stock
      await tx.insert(saleItemInventoryTable).values({
        saleItemId: backorder.saleItemId,
        inventoryStockId: inventoryStockId,
        lotNumber: inventoryStock.lotNumber,
        quantityToTake: actualQuantityFulfilling,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Log Inventory Transaction (as backorder_fulfillment)
      await tx.insert(inventoryTransactionsTable).values({
        inventoryId: inventoryStockId,
        productId: backorder.productId,
        storeId: backorder.storeId,
        userId: userId,
        transactionType: "backorder_fulfillment" as InventoryTransactionType,
        quantityBefore: inventoryStock.quantity,
        quantityAfter: inventoryStock.quantity,
        transactionDate: new Date(),
        referenceId: backorder.id,
        notes: `Backorder ${backorder.id} provisioned with ${actualQuantityFulfilling} units from lot ${inventoryStock.lotNumber}. Physical stock remains unchanged until delivery.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        fulfilledQuantity: actualQuantityFulfilling,
        remainingPendingQuantity: newBackorderPendingQuantity,
      };
    });

    revalidatePath("/inventory");
    revalidatePath("/inventory/inventory-stocks");
    revalidatePath("/sales");
    revalidatePath("/backorders");
    return parseStringify(result);
  } catch (error) {
    console.error("Error fulfilling single backorder:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to fulfill backorder"
    );
  }
};

export const softDeleteBackorder = async (backorderId: string) => {
  try {
    await db
      .update(backordersTable)
      .set({ pendingQuantity: 0, isActive: false, updatedAt: new Date() })
      .where(eq(backordersTable.id, backorderId));

    revalidatePath("/backorders");
    return { success: true };
  } catch (error) {
    console.error("Error deleting backorder:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to delete backorder"
    );
  }
};
