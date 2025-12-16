/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { PromissoryNoteFormValues } from "../validation";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import {
  customersTable,
  promissoryNoteItemsTable,
  promissoryNotesTable,
  salesTable,
} from "@/drizzle/schema";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { PromissoryNoteFilters } from "@/hooks/usePromissoryNote";
import {
  PromissoryNoteItem,
  PromissoryNoteStatus,
  WaybillProductForPromissoryNote,
} from "@/types";

const buildFilterConditions = (filters: PromissoryNoteFilters) => {
  const conditions = [];

  conditions.push(eq(promissoryNotesTable.isActive, true));

  // Search logic using ILIKE on joined tables.
  // GIN indexes are crucial here.
  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(promissoryNotesTable.promissoryNoteRefNumber, searchTerm),
        ilike(customersTable.name, searchTerm),
        ilike(salesTable.invoiceNumber, searchTerm)
      )
    );
  }

  // promissory note date range
  if (filters.promissoryNoteDate_start) {
    conditions.push(
      gte(
        promissoryNotesTable.promissoryNoteDate,
        new Date(filters.promissoryNoteDate_start)
      )
    );
  }
  if (filters.promissoryNoteDate_end) {
    conditions.push(
      lte(
        promissoryNotesTable.promissoryNoteDate,
        new Date(filters.promissoryNoteDate_end)
      )
    );
  }

  // Status filter
  if (filters.status) {
    conditions.push(
      eq(promissoryNotesTable.status, filters.status as PromissoryNoteStatus)
    );
  }

  return conditions;
};

export const addPromissoryNote = async (
  promissoryNoteData: PromissoryNoteFormValues
) => {
  try {
    // 1. Validate sale existence and prevent duplicate promissory notes

    const result = await db.transaction(async (tx) => {
      const sale = await tx
        .select({
          sale: salesTable,
          promissoryNote: promissoryNotesTable,
        })
        .from(salesTable)

        .leftJoin(
          promissoryNotesTable,
          and(
            eq(salesTable.id, promissoryNotesTable.saleId),
            eq(promissoryNotesTable.isActive, true)
          )
        )
        .where(
          and(
            eq(salesTable.id, promissoryNoteData.saleId),
            eq(salesTable.isActive, true)
          )
        )
        .then((res) => res[0]);

      if (!sale) {
        throw new Error("Associated sale not found.");
      }
      // Check if a promissory note already exists for this sale
      if (sale.promissoryNote && sale.promissoryNote.id) {
        throw new Error("Sale already has an active promissory note.");
      }

      // 2. Create the main Promissory Note record
      const [newPromissoryNote] = await tx
        .insert(promissoryNotesTable)
        .values({
          customerId: promissoryNoteData.customerId,
          saleId: promissoryNoteData.saleId,
          promissoryNoteRefNumber: promissoryNoteData.promissoryNoteRefNumber,
          promissoryNoteDate: promissoryNoteData.promissoryNoteDate,
          totalAmount: promissoryNoteData.totalAmount,
          notes: promissoryNoteData.notes,
          status: "pending",
          isActive: true,
        })
        .returning();

      // 4. Process each product from the form, recalculating quantities server-side
      const promissoryNoteItems: (typeof promissoryNoteItemsTable.$inferInsert)[] =
        [];

      for (const product of promissoryNoteData.products) {
        promissoryNoteItems.push({
          promissoryNoteId: newPromissoryNote.id,
          productId: product.productId,
          saleItemId: product.saleItemId,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          subTotal: product.subTotal,
          fulfilledQuantity: 0,
          productName: product.productName,
          productID: product.productID,
          isActive: true,
        });
      }

      // 5. Insert the Promissory Note Items
      const insertedPromissoryNoteItems = await tx
        .insert(promissoryNoteItemsTable)
        .values(promissoryNoteItems)
        .returning();

      return {
        promissoryNote: newPromissoryNote,
        items: insertedPromissoryNoteItems,
      };
    });

    revalidatePath("/promissory-notes");
    revalidatePath("/sales");
    return parseStringify(result);
  } catch (error) {
    console.error("Error adding promissory note:", error);
    throw error;
  }
};

// Edit promissory note
export const editPromissoryNote = async (
  promissoryNote: PromissoryNoteFormValues,
  promissoryNoteId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Update main Promissory Note record
      const [updatedPromissoryNote] = await tx
        .update(promissoryNotesTable)
        .set({
          customerId: promissoryNote.customerId,
          saleId: promissoryNote.saleId,
          promissoryNoteRefNumber: promissoryNote.promissoryNoteRefNumber,
          promissoryNoteDate: promissoryNote.promissoryNoteDate,
          totalAmount: promissoryNote.totalAmount,
          notes: promissoryNote.notes,
        })
        .where(eq(promissoryNotesTable.id, promissoryNoteId))
        .returning();

      // Process each product in the updated PromissoryNote
      const promissoryNoteItems = [];
      for (const product of promissoryNote.products) {
        // update promissory note item
        const [updatedItem] = await tx
          .update(promissoryNoteItemsTable)
          .set({
            productId: product.productId,
            saleItemId: product.saleItemId,
            quantity: product.quantity,
            unitPrice: product.unitPrice,
            subTotal: product.subTotal,
            productName: product.productName,
            productID: product.productID,
          })
          .where(
            and(
              eq(promissoryNoteItemsTable.promissoryNoteId, promissoryNoteId),
              eq(promissoryNoteItemsTable.productId, product.productId),
              eq(promissoryNoteItemsTable.productID, product.productID),
              eq(promissoryNoteItemsTable.isActive, true)
            )
          )
          .returning();

        promissoryNoteItems.push(updatedItem);
      }

      return {
        promissoryNote: updatedPromissoryNote,
        items: promissoryNoteItems,
      };
    });

    revalidatePath("/promissory-notes");
    return parseStringify(result);
  } catch (error) {
    console.error("Error editing promissory note:", error);
    throw error;
  }
};

// Permanently delete PromissoryNote
export const deletePromissoryNote = async (promissoryNoteId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Delete promissory note items
      await tx
        .delete(promissoryNoteItemsTable)
        .where(eq(promissoryNoteItemsTable.promissoryNoteId, promissoryNoteId));

      // Delete the main promissory note record
      const [deletedPromissoryNote] = await tx
        .delete(promissoryNotesTable)
        .where(eq(promissoryNotesTable.id, promissoryNoteId))
        .returning();

      return deletedPromissoryNote;
    });

    revalidatePath("/promissory-notes");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting promissory note:", error);
    throw error;
  }
};

// Soft delete promissory note
export const softDeletePromissoryNote = async (promissoryNoteId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Soft delete promissory note items
      await tx
        .update(promissoryNoteItemsTable)
        .set({ isActive: false })
        .where(eq(promissoryNoteItemsTable.promissoryNoteId, promissoryNoteId));

      // Soft delete main promissory note record
      const [updatedPromissoryNote] = await tx
        .update(promissoryNotesTable)
        .set({ isActive: false })
        .where(eq(promissoryNotesTable.id, promissoryNoteId))
        .returning();

      return updatedPromissoryNote;
    });

    revalidatePath("/promissory-notes");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting promissory note:", error);
    throw error;
  }
};

// Generate promissory note reference number
export const generatePromissoryNoteRefNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastPromissoryNote = await tx
        .select({
          promissoryNoteRefNumber: promissoryNotesTable.promissoryNoteRefNumber,
        })
        .from(promissoryNotesTable)
        .where(sql`promissory_note_ref_number LIKE ${`PN${year}/${month}/%`}`)
        .orderBy(desc(promissoryNotesTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastPromissoryNote.length > 0) {
        const lastRefNumber = lastPromissoryNote[0].promissoryNoteRefNumber;
        const lastSequence = parseInt(
          lastRefNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");
      return `PN${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating promissory note reference number:", error);
    throw error;
  }
};

// Get PromissoryNote by ID
export const getPromissoryNoteById = async (promissoryNoteId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main promissory note record
      const promissoryNote = await tx
        .select({
          promissoryNote: promissoryNotesTable,
          sale: salesTable,
          customer: customersTable,
        })
        .from(promissoryNotesTable)
        .leftJoin(
          salesTable,
          and(
            eq(promissoryNotesTable.saleId, salesTable.id),
            eq(salesTable.isActive, true)
          )
        )
        .leftJoin(
          customersTable,
          and(
            eq(promissoryNotesTable.customerId, customersTable.id),
            eq(customersTable.isActive, true)
          )
        )
        .where(
          and(
            eq(promissoryNotesTable.id, promissoryNoteId),
            eq(promissoryNotesTable.isActive, true)
          )
        )
        .then((res) => res[0]);

      if (!promissoryNote) return null;

      // Get all items for this promissory note
      const items = await tx
        .select()
        .from(promissoryNoteItemsTable)
        .where(
          and(
            eq(promissoryNoteItemsTable.promissoryNoteId, promissoryNoteId),
            eq(promissoryNoteItemsTable.isActive, true)
          )
        );

      return {
        ...promissoryNote,
        products: items,
      };
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting promissory note by ID:", error);
    throw error;
  }
};

// Get all promissory notes with pagination
export const getPromissoryNotes = async (
  page: number = 0,
  limit: number = 10,
  getAllPromissoryNotes: boolean = false,
  filters?: PromissoryNoteFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create base query
      let promissoryNotesQuery = tx
        .select({
          promissoryNote: promissoryNotesTable,
          sale: salesTable,
          customer: customersTable,
        })
        .from(promissoryNotesTable)
        .leftJoin(
          salesTable,
          and(
            eq(promissoryNotesTable.saleId, salesTable.id),
            eq(salesTable.isActive, true)
          )
        )
        .leftJoin(
          customersTable,
          and(
            eq(promissoryNotesTable.customerId, customersTable.id),
            eq(customersTable.isActive, true)
          )
        )
        .$dynamic();
      const conditions = await buildFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        promissoryNotesQuery = promissoryNotesQuery.where(and(...conditions));
      }

      promissoryNotesQuery = promissoryNotesQuery.orderBy(
        desc(promissoryNotesTable.createdAt)
      );

      if (!getAllPromissoryNotes && limit > 0) {
        promissoryNotesQuery = promissoryNotesQuery
          .limit(limit)
          .offset(page * limit);
      }

      const promissoryNotes = await promissoryNotesQuery;

      // Get all products for these promissory notes in a single query
      const promissoryNotesIds = promissoryNotes.map(
        (n) => n.promissoryNote.id
      );
      const items =
        promissoryNotesIds.length > 0
          ? await tx
              .select()
              .from(promissoryNoteItemsTable)
              .where(
                and(
                  inArray(
                    promissoryNoteItemsTable.promissoryNoteId,
                    promissoryNotesIds
                  ),
                  eq(promissoryNoteItemsTable.isActive, true)
                )
              )
          : [];

      // Create a map of promissoryNote ID to its items
      const itemsMap = new Map();
      items.forEach((item) => {
        if (!itemsMap.has(item.promissoryNoteId)) {
          itemsMap.set(item.promissoryNoteId, []);
        }
        itemsMap.get(item.promissoryNoteId).push(item);
      });

      // Get total count for pagination
      let totalQuery = tx
        .select({ count: sql<number>`count(*)` })
        .from(promissoryNotesTable)
        .leftJoin(
          salesTable,
          and(
            eq(promissoryNotesTable.saleId, salesTable.id),
            eq(salesTable.isActive, true)
          )
        )
        .leftJoin(
          customersTable,
          and(
            eq(promissoryNotesTable.customerId, customersTable.id),
            eq(customersTable.isActive, true)
          )
        )
        .$dynamic();

      if (conditions.length > 0) {
        totalQuery = totalQuery.where(and(...conditions));
      }

      const total = getAllPromissoryNotes
        ? promissoryNotes.length
        : await totalQuery.then((res) => res[0]?.count || 0);

      return {
        documents: promissoryNotes.map((promissoryNote) => ({
          ...promissoryNote,
          products: itemsMap.get(promissoryNote.promissoryNote.id) || [],
        })),
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting promissory notes:", error);
    throw error;
  }
};

// Helper function to update promissory note based on waybill creation
export const updatePromissoryNoteForWaybill = async (
  tx: any,
  saleId: string,
  waybillProducts: WaybillProductForPromissoryNote[]
) => {
  // Get the promissory note for this sale
  const [promissoryNote] = await tx
    .select()
    .from(promissoryNotesTable)
    .where(
      and(
        eq(promissoryNotesTable.saleId, saleId),
        eq(promissoryNotesTable.isActive, true)
      )
    )
    .limit(1);

  // If no active promissory note exists, nothing to update
  if (!promissoryNote) {
    return;
  }

  // Get all active promissory note items for this note
  const promissoryNoteItems: PromissoryNoteItem[] = await tx
    .select()
    .from(promissoryNoteItemsTable)
    .where(
      and(
        eq(promissoryNoteItemsTable.promissoryNoteId, promissoryNote.id),
        eq(promissoryNoteItemsTable.isActive, true)
      )
    );

  if (promissoryNoteItems.length === 0) {
    await tx
      .update(promissoryNotesTable)
      .set({
        isActive: false,
        status: PromissoryNoteStatus.Fulfiled,
        totalAmount: 0,
      })
      .where(eq(promissoryNotesTable.id, promissoryNote.id));
    return;
  }

  //  Create a mutable map for in-memory calculations and efficient lookup
  const mutablePromissoryNoteItemsMap = new Map<string, PromissoryNoteItem>(
    promissoryNoteItems.map((item) => [
      `${item.productId}_${item.productID}`,
      { ...item },
    ])
  );

  const waybillProductsMap = new Map<string, number>();
  // Aggregate waybill quantities by product (in case same product appears multiple times)
  waybillProducts.forEach((product) => {
    const key = `${product.productId}_${product.productID}`;
    const existing = waybillProductsMap.get(key) || 0;
    waybillProductsMap.set(key, existing + product.quantitySupplied);
  });

  // 4. Identify overlapping products and calculate updates IN MEMORY
  const itemsToUpdateDB: Array<{
    id: string;
    newQuantity: number;
    newSubTotal: number;
    newIsActive: boolean;
  }> = [];

  let currentlyActiveItemsCount = 0;
  let calculatedTotalAmount = 0;

  for (const [key, promissoryItem] of mutablePromissoryNoteItemsMap.entries()) {
    const quantitySuppliedByWaybill = waybillProductsMap.get(key) || 0;

    if (quantitySuppliedByWaybill > 0) {
      // Overlapping product found and supplied
      const newQuantity = Math.max(
        0,
        promissoryItem.quantity - quantitySuppliedByWaybill
      );
      const newSubTotal = newQuantity * promissoryItem.unitPrice;
      const newIsActive = newQuantity > 0;

      // Update in-memory item state
      promissoryItem.quantity = newQuantity;
      promissoryItem.subTotal = newSubTotal;
      promissoryItem.isActive = newIsActive;

      // Add to list for DB update
      itemsToUpdateDB.push({
        id: promissoryItem.id,
        newQuantity,
        newSubTotal,
        newIsActive,
      });
    }

    // After potential update, check its IN-MEMORY active status to count
    if (promissoryItem.isActive) {
      currentlyActiveItemsCount++;
      calculatedTotalAmount += promissoryItem.subTotal;
    }
  }

  // Update quantities and subTotals for items that changed
  if (itemsToUpdateDB.length > 0) {
    const updatePromises = itemsToUpdateDB.map((item) =>
      tx
        .update(promissoryNoteItemsTable)
        .set({
          quantity: item.newQuantity,
          subTotal: item.newSubTotal,
          isActive: item.newIsActive,
        })
        .where(eq(promissoryNoteItemsTable.id, item.id))
    );
    await Promise.all(updatePromises);
  }

  // Update the main promissory note based on the calculated in-memory state
  if (currentlyActiveItemsCount === 0) {
    await tx
      .update(promissoryNotesTable)
      .set({
        isActive: false,
        status: PromissoryNoteStatus.Fulfiled,
        totalAmount: 0,
      })
      .where(eq(promissoryNotesTable.id, promissoryNote.id));
  } else {
    await tx
      .update(promissoryNotesTable)
      .set({
        totalAmount: calculatedTotalAmount,
        isActive: true,
        status: PromissoryNoteStatus.Pending,
      })
      .where(eq(promissoryNotesTable.id, promissoryNote.id));
  }
};

export const updatePromissoryNoteForWaybillEdit = async (
  tx: any,
  saleId: string,
  previousWaybillProducts: WaybillProductForPromissoryNote[],
  newWaybillProducts: WaybillProductForPromissoryNote[]
) => {
  // Get the promissory note for this sale
  const [promissoryNote] = await tx
    .select()
    .from(promissoryNotesTable)
    .where(
      and(
        eq(promissoryNotesTable.saleId, saleId),
        eq(promissoryNotesTable.isActive, true)
      )
    )
    .limit(1);

  // If no active promissory note exists, nothing to update
  if (!promissoryNote) {
    return;
  }

  // Get all promissory note items (both active and inactive)
  const allPromissoryNoteItems: PromissoryNoteItem[] = await tx
    .select()
    .from(promissoryNoteItemsTable)
    .where(eq(promissoryNoteItemsTable.promissoryNoteId, promissoryNote.id));

  if (allPromissoryNoteItems.length === 0) {
    await tx
      .update(promissoryNotesTable)
      .set({
        isActive: false,
        status: PromissoryNoteStatus.Fulfiled,
        totalAmount: 0,
      })
      .where(eq(promissoryNotesTable.id, promissoryNote.id));
    return;
  }

  // Create a mutable map for in-memory calculations and efficient lookup
  const mutablePromissoryNoteItemsMap = new Map<string, PromissoryNoteItem>(
    allPromissoryNoteItems.map((item) => [
      `${item.productId}_${item.productID}`,
      { ...item },
    ])
  );

  const previousWaybillMap = new Map<string, number>();
  previousWaybillProducts.forEach((product) => {
    const key = `${product.productId}_${product.productID}`;
    const existing = previousWaybillMap.get(key) || 0;
    previousWaybillMap.set(key, existing + product.quantitySupplied);
  });

  const newWaybillMap = new Map<string, number>();
  newWaybillProducts.forEach((product) => {
    const key = `${product.productId}_${product.productID}`;
    const existing = newWaybillMap.get(key) || 0;
    newWaybillMap.set(key, existing + product.quantitySupplied);
  });

  // Calculate net changes and determine updates IN MEMORY
  const itemsToUpdateDB: Array<{
    id: string;
    newQuantity: number;
    newSubTotal: number;
    newIsActive: boolean;
  }> = [];

  let currentlyActiveItemsCount = 0;
  let calculatedTotalAmount = 0;

  for (const [key, promissoryItem] of mutablePromissoryNoteItemsMap.entries()) {
    const previousQuantitySupplied = previousWaybillMap.get(key) || 0;
    const newQuantitySupplied = newWaybillMap.get(key) || 0;

    const netChangeInDelivered = previousQuantitySupplied - newQuantitySupplied;

    // Calculate the new quantity for this promissory note item IN MEMORY
    // Add the netChangeInDelivered to the current promissory item quantity.
    let updatedPromissoryQuantity =
      promissoryItem.quantity + netChangeInDelivered;

    // Ensure quantity doesn't go negative
    updatedPromissoryQuantity = Math.max(0, updatedPromissoryQuantity);

    const newSubTotal = updatedPromissoryQuantity * promissoryItem.unitPrice;
    const newIsActive = updatedPromissoryQuantity > 0;

    // Only add to DB update list if there's an actual change in state (quantity or isActive status)
    if (
      updatedPromissoryQuantity !== promissoryItem.quantity ||
      newIsActive !== promissoryItem.isActive
    ) {
      itemsToUpdateDB.push({
        id: promissoryItem.id,
        newQuantity: updatedPromissoryQuantity,
        newSubTotal,
        newIsActive,
      });
    }

    // Update in-memory item state
    promissoryItem.quantity = updatedPromissoryQuantity;
    promissoryItem.subTotal = newSubTotal;
    promissoryItem.isActive = newIsActive;

    // After potential update, check its IN-MEMORY active status to count
    if (promissoryItem.isActive) {
      currentlyActiveItemsCount++;
      calculatedTotalAmount += promissoryItem.subTotal;
    }
  }

  // Update quantities and isActive for items that still have remaining quantity or changed status
  if (itemsToUpdateDB.length > 0) {
    const updatePromises = itemsToUpdateDB.map((item) =>
      tx
        .update(promissoryNoteItemsTable)
        .set({
          quantity: item.newQuantity,
          subTotal: item.newSubTotal,
          isActive: item.newIsActive,
        })
        .where(eq(promissoryNoteItemsTable.id, item.id))
    );
    await Promise.all(updatePromises);
  }

  // Update the main promissory note based on the calculated in-memory state
  if (currentlyActiveItemsCount === 0) {
    await tx
      .update(promissoryNotesTable)
      .set({
        isActive: false,
        status: PromissoryNoteStatus.Fulfiled,
        totalAmount: 0,
      })
      .where(eq(promissoryNotesTable.id, promissoryNote.id));
  } else {
    await tx
      .update(promissoryNotesTable)
      .set({
        totalAmount: calculatedTotalAmount,
        isActive: true,
        status: PromissoryNoteStatus.Pending,
      })
      .where(eq(promissoryNotesTable.id, promissoryNote.id));
  }
};
