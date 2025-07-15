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
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { PromissoryNoteFilters } from "@/hooks/usePromissoryNote";
import { PromissoryNoteStatus } from "@/types";

export const addPromissoryNote = async (
  promissoryNote: PromissoryNoteFormValues
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create main promissory note record
      const [newPromissoryNote] = await tx
        .insert(promissoryNotesTable)
        .values({
          customerId: promissoryNote.customerId,
          saleId: promissoryNote.saleId,
          promissoryNoteRefNumber: promissoryNote.promissoryNoteRefNumber,
          promissoryNoteDate: promissoryNote.promissoryNoteDate,
          totalAmount: promissoryNote.totalAmount,
          notes: promissoryNote.notes,
          status: "pending",
        })
        .returning();

      // Process each product in the promissory note
      const promissoryNoteItems = [];
      for (const product of promissoryNote.products) {
        // Create promissory note item
        const [promissoryNoteItem] = await tx
          .insert(promissoryNoteItemsTable)
          .values({
            promissoryNoteId: newPromissoryNote.id,
            productId: product.productId,
            saleItemId: product.saleItemId,
            quantity: product.quantity,
            unitPrice: product.unitPrice,
            subTotal: product.subTotal,
            productName: product.productName,
            productID: product.productID,
          })
          .returning();

        promissoryNoteItems.push(promissoryNoteItem);
      }

      return { promissoryNote: newPromissoryNote, items: promissoryNoteItems };
    });

    revalidatePath("/promissory-notes");
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
        .leftJoin(salesTable, eq(promissoryNotesTable.saleId, salesTable.id))
        .leftJoin(
          customersTable,
          eq(promissoryNotesTable.customerId, customersTable.id)
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
        .leftJoin(salesTable, eq(promissoryNotesTable.saleId, salesTable.id))
        .leftJoin(
          customersTable,
          eq(promissoryNotesTable.customerId, customersTable.id)
        )
        .$dynamic();

      // Create conditions array
      const conditions = [eq(promissoryNotesTable.isActive, true)];

      // Apply filters if provided
      if (filters) {
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
            eq(
              promissoryNotesTable.status,
              filters.status as PromissoryNoteStatus
            )
          );
        }
      }

      // Apply where conditions
      promissoryNotesQuery = promissoryNotesQuery.where(and(...conditions));

      // Apply order by
      promissoryNotesQuery = promissoryNotesQuery.orderBy(
        desc(promissoryNotesTable.createdAt)
      );

      if (!getAllPromissoryNotes) {
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
      const total = getAllPromissoryNotes
        ? promissoryNotes.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(promissoryNotesTable)
            .where(and(...conditions))
            .then((res) => res[0]?.count || 0);

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
