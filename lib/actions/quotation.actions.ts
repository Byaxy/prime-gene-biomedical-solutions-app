/* eslint-disable @typescript-eslint/no-explicit-any */
// quotation.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import {
  quotationsTable,
  quotationItemsTable,
  customersTable,
} from "@/drizzle/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { QuotationFormValues } from "../validation";

// Add new quotation with transaction
export const addQuotation = async (quotation: QuotationFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Create main quotation record
      const [newQuotation] = await tx
        .insert(quotationsTable)
        .values({
          quotationNumber: quotation.quotationNumber,
          rfqNumber: quotation.rfqNumber,
          quotationDate: quotation.quotationDate,
          customerId: quotation.customerId,
          taxRateId: quotation.taxRateId,
          discountAmount: quotation.discountAmount,
          discountRate: quotation.discountRate,
          totalAmount: quotation.totalAmount,
          totalTaxAmount: quotation.totalTaxAmount,
          status: quotation.status as "pending" | "completed" | "cancelled",
          notes: quotation.notes,
          attachments: quotation.attachments,
          convertedToSale: quotation.convertedToSale,
        })
        .returning();

      // Create quotation items
      const quotationItems = await Promise.all(
        quotation.products.map(async (product) => {
          const [newItem] = await tx
            .insert(quotationItemsTable)
            .values({
              quotationId: newQuotation.id,
              productId: product.productId,
              quantity: product.quantity,
              unitPrice: product.unitPrice,
              totalPrice: product.totalPrice,
              subTotal: product.subTotal,
              taxAmount: product.taxAmount,
              discountAmount: product.discountAmount,
              discountRate: product.discountRate,
              taxRate: product.taxRate,
              productName: product.productName,
              productID: product.productID,
            })
            .returning();
          return newItem;
        })
      );

      return { quotation: newQuotation, items: quotationItems };
    });

    revalidatePath("/quotations");
    return parseStringify(result);
  } catch (error) {
    console.error("Error creating quotation:", error);
    throw error;
  }
};

// Edit quotation with transaction
export const editQuotation = async (
  quotation: QuotationFormValues,
  quotationId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Update main quotation record
      const updatedQuotationData = {
        ...quotation,
        status: quotation.status as "pending" | "completed" | "cancelled",
      };

      const [updatedQuotation] = await tx
        .update(quotationsTable)
        .set(updatedQuotationData)
        .where(eq(quotationsTable.id, quotationId))
        .returning();

      // Get existing quotation items
      const existingItems = await tx
        .select()
        .from(quotationItemsTable)
        .where(eq(quotationItemsTable.quotationId, quotationId));

      const newProductIds = new Set(
        quotation.products.map((product) => product.productId)
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
              .delete(quotationItemsTable)
              .where(eq(quotationItemsTable.id, item.id))
          )
        );
      }

      // Create a map of existing items for updates
      const existingItemsMap = new Map(
        existingItems.map((item) => [item.productId, item])
      );

      // Process updates and additions
      const updatedItems = await Promise.all(
        quotation.products.map(async (product) => {
          const existingItem = existingItemsMap.get(product.productId);

          if (existingItem) {
            // Update existing item
            const [updatedItem] = await tx
              .update(quotationItemsTable)
              .set({
                quantity: product.quantity,
                unitPrice: product.unitPrice,
                totalPrice: product.totalPrice,
                subTotal: product.subTotal,
                taxAmount: product.taxAmount,
                taxRate: product.taxRate,
                discountAmount: product.discountAmount,
                discountRate: product.discountRate,
              })
              .where(eq(quotationItemsTable.id, existingItem.id))
              .returning();
            return updatedItem;
          } else {
            // Create new item
            const [newItem] = await tx
              .insert(quotationItemsTable)
              .values({
                quotationId,
                productId: product.productId,
                quantity: product.quantity,
                unitPrice: product.unitPrice,
                totalPrice: product.totalPrice,
                subTotal: product.subTotal,
                taxAmount: product.taxAmount,
                taxRate: product.taxRate,
                discountAmount: product.discountAmount,
                discountRate: product.discountRate,
                productName: product.productName,
                productID: product.productID,
              })
              .returning();
            return newItem;
          }
        })
      );

      return { quotation: updatedQuotation, items: updatedItems };
    });

    revalidatePath("/quotations");
    revalidatePath(`/quotations/edit-quotation/${quotationId}`);
    return parseStringify(result);
  } catch (error) {
    console.error("Error updating quotation:", error);
    throw error;
  }
};

// Get quotation by ID with items
export const getQuotationById = async (quotationId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main quotation
      const quotation = await tx
        .select({
          quotation: quotationsTable,
          customer: customersTable,
        })
        .from(quotationsTable)
        .leftJoin(
          customersTable,
          eq(quotationsTable.customerId, customersTable.id)
        )
        .where(eq(quotationsTable.id, quotationId))
        .then((res) => res[0]);

      if (!quotation) {
        return null;
      }

      // Get all items for this quotation
      const items = await tx
        .select({
          id: quotationItemsTable.id,
          quantity: quotationItemsTable.quantity,
          unitPrice: quotationItemsTable.unitPrice,
          totalPrice: quotationItemsTable.totalPrice,
          subTotal: quotationItemsTable.subTotal,
          taxAmount: quotationItemsTable.taxAmount,
          taxRate: quotationItemsTable.taxRate,
          discountAmount: quotationItemsTable.discountAmount,
          discountRate: quotationItemsTable.discountRate,
          productName: quotationItemsTable.productName,
          productID: quotationItemsTable.productID,
          productId: quotationItemsTable.productId,
        })
        .from(quotationItemsTable)
        .where(eq(quotationItemsTable.quotationId, quotationId));

      // Combine the data
      const quotationWithItems = {
        ...quotation,
        products: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          subTotal: item.subTotal,
          taxAmount: item.taxAmount,
          taxRate: item.taxRate,
          discountAmount: item.discountAmount,
          discountRate: item.discountRate,
          productName: item.productName,
          productID: item.productID,
          productId: item.productId,
        })),
      };

      return quotationWithItems;
    });

    return result ? parseStringify(result) : null;
  } catch (error) {
    console.error("Error getting quotation:", error);
    throw error;
  }
};

// Generate quotation number
export const generateQuotationNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastQuotation = await tx
        .select({ quotationNumber: quotationsTable.quotationNumber })
        .from(quotationsTable)
        .where(
          sql`quotation_number LIKE ${`PFI${year}/${month}/%`}` &&
            eq(quotationsTable.isActive, true)
        )
        .orderBy(desc(quotationsTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastQuotation.length > 0) {
        const lastQuotationNumber = lastQuotation[0].quotationNumber;
        const lastSequence = parseInt(
          lastQuotationNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `PFI${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating quotation number:", error);
    throw error;
  }
};

// Get all quotations with pagination
export const getQuotations = async (
  page: number = 0,
  limit: number = 10,
  getAllQuotations: boolean = false
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main quotations (all or paginated)
      const quotationsQuery = tx
        .select({
          quotation: quotationsTable,
          customer: customersTable,
        })
        .from(quotationsTable)
        .leftJoin(
          customersTable,
          eq(quotationsTable.customerId, customersTable.id)
        )
        .where(eq(quotationsTable.isActive, true))
        .orderBy(desc(quotationsTable.createdAt));

      if (!getAllQuotations) {
        quotationsQuery.limit(limit).offset(page * limit);
      }

      const quotations = await quotationsQuery;

      // Get all items for these quotations in a single query
      const quotationIds = quotations.map((q) => q.quotation.id);
      const items = await tx
        .select({
          quotationId: quotationItemsTable.quotationId,
          id: quotationItemsTable.id,
          quantity: quotationItemsTable.quantity,
          unitPrice: quotationItemsTable.unitPrice,
          totalPrice: quotationItemsTable.totalPrice,
          subTotal: quotationItemsTable.subTotal,
          taxAmount: quotationItemsTable.taxAmount,
          taxRate: quotationItemsTable.taxRate,
          discountAmount: quotationItemsTable.discountAmount,
          discountRate: quotationItemsTable.discountRate,
          productName: quotationItemsTable.productName,
          productID: quotationItemsTable.productID,
          productId: quotationItemsTable.productId,
        })
        .from(quotationItemsTable)
        .where(
          inArray(quotationItemsTable.quotationId, quotationIds) &&
            eq(quotationItemsTable.isActive, true)
        );

      // Combine the data
      const quotationsWithItems = quotations.map((quotation) => ({
        ...quotation,
        products: items
          .filter((item) => item.quotationId === quotation.quotation.id)
          .map((item) => ({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            subTotal: item.subTotal,
            taxAmount: item.taxAmount,
            taxRate: item.taxRate,
            discountAmount: item.discountAmount,
            discountRate: item.discountRate,
            productName: item.productName,
            productID: item.productID,
            productId: item.productId,
          })),
      }));

      // Get total count for pagination
      const total = getAllQuotations
        ? quotations.length
        : await tx
            .select({ count: sql<number>`count(*)` })
            .from(quotationsTable)
            .then((res) => res[0]?.count || 0);

      return {
        documents: quotationsWithItems,
        total,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error) {
    console.error("Error getting quotations:", error);
    throw error;
  }
};

// Permanently delete quotation with transaction
export const deleteQuotation = async (quotationId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Delete quotation items first
      await tx
        .delete(quotationItemsTable)
        .where(eq(quotationItemsTable.quotationId, quotationId));

      // Delete the main quotation record
      const [deletedQuotation] = await tx
        .delete(quotationsTable)
        .where(eq(quotationsTable.id, quotationId))
        .returning();

      return deletedQuotation;
    });

    revalidatePath("/quotations");
    return parseStringify(result);
  } catch (error) {
    console.error("Error deleting quotation:", error);
    throw error;
  }
};

// Soft delete quotation with transaction
export const softDeleteQuotation = async (quotationId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      await tx
        .update(quotationItemsTable)
        .set({ isActive: false })
        .where(eq(quotationItemsTable.quotationId, quotationId));

      const [updatedQuotation] = await tx
        .update(quotationsTable)
        .set({ isActive: false })
        .where(eq(quotationsTable.id, quotationId))
        .returning();

      return updatedQuotation;
    });
    revalidatePath("/quotations");
    return parseStringify(result);
  } catch (error) {
    console.error("Error soft deleting quotation:", error);
    throw error;
  }
};
