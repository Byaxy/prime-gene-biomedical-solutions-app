/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { and, desc, eq, gte, ilike, lte, or, sql, inArray } from "drizzle-orm";
import { ReceiptFormValues, ReceiptFilters } from "../validation";
import {
  receiptsTable,
  receiptItemsTable,
  paymentsReceivedTable,
  customersTable,
  salesTable,
  incomeCategoriesTable,
  accountsTable, // Needed for ReceiptItemWithRelations on paymentsReceived
} from "@/drizzle/schema";
import { PaymentMethod, Attachment } from "@/types";
import { db } from "@/drizzle/db";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import {
  ReceiptWithRelations,
  ReceiptItemWithRelations,
  PaymentReceived,
  Sale,
  IncomeCategory,
  Account,
  Customer,
} from "@/types";

// Build filter conditions for getReceipts
const buildReceiptFilterConditions = (filters: ReceiptFilters) => {
  const conditions = [];

  conditions.push(eq(receiptsTable.isActive, true));

  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(receiptsTable.receiptNumber, searchTerm),
        ilike(customersTable.name, searchTerm)
      )
    );
  }

  if (filters.customerId) {
    conditions.push(eq(receiptsTable.customerId, filters.customerId));
  }

  if (filters.receiptDate_start) {
    conditions.push(
      gte(receiptsTable.receiptDate, new Date(filters.receiptDate_start))
    );
  }

  if (filters.receiptDate_end) {
    conditions.push(
      lte(receiptsTable.receiptDate, new Date(filters.receiptDate_end))
    );
  }

  if (filters.amount_min !== undefined) {
    conditions.push(gte(receiptsTable.totalAmountReceived, filters.amount_min));
  }

  if (filters.amount_max !== undefined) {
    conditions.push(lte(receiptsTable.totalAmountReceived, filters.amount_max));
  }

  return conditions;
};

export const createReceipt = async (values: ReceiptFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      const existingReceipt = await tx
        .select({ id: receiptsTable.id })
        .from(receiptsTable)
        .where(eq(receiptsTable.receiptNumber, values.receiptNumber));
      if (existingReceipt.length > 0) {
        throw new Error("Receipt number already exists.");
      }

      const receiptItemEntities = values.receiptItems.map((item) => ({
        paymentReceivedId: item.paymentReceivedId,
        invoiceNumber: item.invoiceNumber || null,
        invoiceDate: item.invoiceDate || null,
        amountDue: item.amountDue,
        amountReceived: item.amountReceived,
        balanceDue: item.balanceDue || null,
        paymentMethod: item.paymentMethod as PaymentMethod,
        saleId: item.saleId || null,
        incomeCategoryId: item.incomeCategoryId || null,
      }));

      const [newReceipt] = await tx
        .insert(receiptsTable)
        .values({
          ...values,
          attachments: values.attachments || [],
        })
        .returning();

      if (!newReceipt) {
        throw new Error("Failed to create receipt record.");
      }

      const receiptItemsToInsert = receiptItemEntities.map((item) => ({
        ...item,
        receiptId: newReceipt.id,
      }));
      await tx.insert(receiptItemsTable).values(receiptItemsToInsert);

      const paymentIdsToUpdate = receiptItemEntities.map(
        (item) => item.paymentReceivedId
      );
      if (paymentIdsToUpdate.length > 0) {
        await tx
          .update(paymentsReceivedTable)
          .set({ isReceiptGenerated: true, updatedAt: new Date() })
          .where(inArray(paymentsReceivedTable.id, paymentIdsToUpdate));
      }

      return { receipt: newReceipt };
    });

    revalidatePath("/accounting-and-finance/income/receipts");
    revalidatePath("/accounting-and-finance/income");

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating receipt:", error);
    throw new Error(error.message || "Failed to create receipt.");
  }
};

export const getReceipts = async (
  page: number = 0,
  limit: number = 10,
  getAll: boolean = false,
  filters?: ReceiptFilters
): Promise<{ documents: ReceiptWithRelations[]; total: number }> => {
  try {
    const result = await db.transaction(async (tx) => {
      // Base query for receipts and their direct customer relation
      let baseReceiptQuery = tx
        .select({
          receipt: receiptsTable,
          customer: customersTable,
        })
        .from(receiptsTable)
        .leftJoin(
          customersTable,
          eq(receiptsTable.customerId, customersTable.id)
        )
        .where(eq(receiptsTable.isActive, true))
        .$dynamic();

      const conditions = buildReceiptFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        baseReceiptQuery = baseReceiptQuery.where(and(...conditions));
      }

      baseReceiptQuery = baseReceiptQuery.orderBy(
        desc(receiptsTable.receiptDate)
      );

      // Get total count of matching receipts
      const [countResult] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(receiptsTable)
        .leftJoin(
          customersTable,
          eq(receiptsTable.customerId, customersTable.id)
        )
        .where(and(eq(receiptsTable.isActive, true), ...conditions));
      const totalCount = countResult?.count || 0;

      //  Apply pagination to the base receipt query
      let paginatedReceiptsQuery = baseReceiptQuery;
      if (!getAll) {
        paginatedReceiptsQuery = paginatedReceiptsQuery
          .limit(limit)
          .offset(page * limit);
      }
      const fetchedReceipts = await paginatedReceiptsQuery;

      if (fetchedReceipts.length === 0) {
        return { documents: [], total: totalCount };
      }

      // Fetch all related receipt items and their relations in one go for the fetched receipts
      const receiptIds = fetchedReceipts.map((r) => r.receipt.id);

      const relatedItemsData = await tx
        .select({
          receiptItem: receiptItemsTable,
          paymentReceived: paymentsReceivedTable,
          sale: salesTable,
          incomeCategory: incomeCategoriesTable,
          receivingAccount: accountsTable, // Join for paymentReceived's receivingAccount
        })
        .from(receiptItemsTable)
        .where(
          and(
            inArray(receiptItemsTable.receiptId, receiptIds),
            eq(receiptItemsTable.isActive, true)
          )
        )
        .leftJoin(
          paymentsReceivedTable,
          eq(receiptItemsTable.paymentReceivedId, paymentsReceivedTable.id)
        )
        .leftJoin(salesTable, eq(receiptItemsTable.saleId, salesTable.id))
        .leftJoin(
          incomeCategoriesTable,
          eq(receiptItemsTable.incomeCategoryId, incomeCategoriesTable.id)
        )
        .leftJoin(
          accountsTable,
          eq(paymentsReceivedTable.receivingAccountId, accountsTable.id)
        ); // Join with accounts

      // Map items back to their respective receipts
      const receiptItemsMap = new Map<string, ReceiptItemWithRelations[]>();
      relatedItemsData.forEach((row) => {
        if (row.receiptItem) {
          const receiptId = row.receiptItem.receiptId;
          const itemWithRelations: ReceiptItemWithRelations = {
            receiptItem: row.receiptItem,
            paymentReceived: row.paymentReceived as PaymentReceived | null,
            sale: row.sale as Sale | null,
            incomeCategory: row.incomeCategory as IncomeCategory | null,
            // Only add receivingAccount if paymentReceived exists and has a receiving account
            receivingAccount:
              row.paymentReceived && row.receivingAccount
                ? (row.receivingAccount as Account)
                : null,
          };
          if (!receiptItemsMap.has(receiptId)) {
            receiptItemsMap.set(receiptId, []);
          }
          receiptItemsMap.get(receiptId)!.push(itemWithRelations);
        }
      });

      // Construct the final ReceiptWithRelations array
      const documents: ReceiptWithRelations[] = fetchedReceipts.map((fr) => ({
        receipt: fr.receipt,
        customer: fr.customer as Customer | null,
        items: receiptItemsMap.get(fr.receipt.id) || [],
      }));

      return { documents, total: totalCount };
    });

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error fetching Receipt records:", error);
    throw new Error(error.message || "Failed to fetch receipt records.");
  }
};

export const getReceiptById = async (
  id: string
): Promise<ReceiptWithRelations | null> => {
  try {
    const receiptData = await db
      .select({
        receipt: receiptsTable,
        customer: customersTable,
      })
      .from(receiptsTable)
      .leftJoin(customersTable, eq(receiptsTable.customerId, customersTable.id))
      .where(and(eq(receiptsTable.id, id), eq(receiptsTable.isActive, true)))
      .then((res) => res[0]);

    if (!receiptData) {
      return null;
    }

    const mainReceipt = receiptData.receipt;
    const customer = receiptData.customer as Customer | null;

    const relatedItemsData = await db
      .select({
        receiptItem: receiptItemsTable,
        paymentReceived: paymentsReceivedTable,
        sale: salesTable,
        incomeCategory: incomeCategoriesTable,
        receivingAccount: accountsTable, // Join for paymentReceived's receivingAccount
      })
      .from(receiptItemsTable)
      .where(eq(receiptItemsTable.receiptId, id))
      .leftJoin(
        paymentsReceivedTable,
        eq(receiptItemsTable.paymentReceivedId, paymentsReceivedTable.id)
      )
      .leftJoin(salesTable, eq(receiptItemsTable.saleId, salesTable.id))
      .leftJoin(
        incomeCategoriesTable,
        eq(receiptItemsTable.incomeCategoryId, incomeCategoriesTable.id)
      )
      .leftJoin(
        accountsTable,
        eq(paymentsReceivedTable.receivingAccountId, accountsTable.id)
      ); // Join with accounts

    const items: ReceiptItemWithRelations[] = relatedItemsData.map((row) => ({
      receiptItem: row.receiptItem,
      paymentReceived: row.paymentReceived as PaymentReceived | null,
      sale: row.sale as Sale | null,
      incomeCategory: row.incomeCategory as IncomeCategory | null,
      receivingAccount:
        row.paymentReceived && row.receivingAccount
          ? (row.receivingAccount as Account)
          : null,
    }));

    return parseStringify({
      receipt: mainReceipt,
      customer: customer,
      items: items,
    });
  } catch (error: any) {
    console.error("Error fetching Receipt record by ID:", error);
    throw new Error(error.message || "Failed to fetch receipt record by ID.");
  }
};

export const updateReceipt = async (id: string, values: ReceiptFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentReceipt = await tx
        .select()
        .from(receiptsTable)
        .where(eq(receiptsTable.id, id))
        .then((res) => res[0]);

      if (!currentReceipt) {
        throw new Error("Receipt record not found.");
      }

      if (
        values.receiptNumber &&
        values.receiptNumber !== currentReceipt.receiptNumber
      ) {
        const existingRef = await tx
          .select({ id: receiptsTable.id })
          .from(receiptsTable)
          .where(
            and(
              eq(receiptsTable.receiptNumber, values.receiptNumber),
              sql`${receiptsTable.id} != ${id}`
            )
          );
        if (existingRef.length > 0) {
          throw new Error("Receipt number already exists for another record.");
        }
      }

      const allAttachments: Attachment[] = values.attachments || [];

      const [updatedReceipt] = await tx
        .update(receiptsTable)
        .set({
          ...values,
          attachments: allAttachments,
          updatedAt: new Date(),
        })
        .where(eq(receiptsTable.id, id))
        .returning();

      if (!updatedReceipt) {
        throw new Error("Receipt record not found or could not be updated.");
      }

      const existingReceiptItems = await tx
        .select({
          id: receiptItemsTable.id,
          paymentReceivedId: receiptItemsTable.paymentReceivedId,
        })
        .from(receiptItemsTable)
        .where(eq(receiptItemsTable.receiptId, id));

      const existingReceiptItemsMap = new Map(
        existingReceiptItems.map((item) => [item.paymentReceivedId, item.id])
      );
      const incomingPaymentReceivedIds = new Set(
        values.receiptItems.map((item) => item.paymentReceivedId)
      );

      const itemsToInsert = [];
      const itemsToUpdate = [];

      for (const incomingItem of values.receiptItems) {
        const existingReceiptItemId = existingReceiptItemsMap.get(
          incomingItem.paymentReceivedId
        );

        if (existingReceiptItemId) {
          // This item exists, add to update list
          itemsToUpdate.push({ ...incomingItem, id: existingReceiptItemId });
        } else {
          // This is a new item, add to insert list
          itemsToInsert.push(incomingItem);
        }
      }

      const itemsToDeleteIds = existingReceiptItems
        .filter(
          (existingItem) =>
            !incomingPaymentReceivedIds.has(existingItem.paymentReceivedId)
        )
        .map((item) => item.id);

      // Perform deletions, insertions, and updates in parallel
      const modificationPromises = [];

      // Determine payment IDs that were previously in this receipt but are no longer
      const paymentIdsNoLongerInReceipt = existingReceiptItems
        .filter(
          (item) => !incomingPaymentReceivedIds.has(item.paymentReceivedId)
        )
        .map((item) => item.paymentReceivedId);

      // Determine new payment IDs being added to this receipt
      const newPaymentIdsInReceipt = itemsToInsert.map(
        (item) => item.paymentReceivedId
      );

      // Update isReceiptGenerated to false for payments removed from this receipt
      if (paymentIdsNoLongerInReceipt.length > 0) {
        modificationPromises.push(
          tx
            .update(paymentsReceivedTable)
            .set({ isReceiptGenerated: false, updatedAt: new Date() })
            .where(
              inArray(paymentsReceivedTable.id, paymentIdsNoLongerInReceipt)
            )
        );
      }

      // Update isReceiptGenerated to true for new payments added to this receipt
      if (newPaymentIdsInReceipt.length > 0) {
        modificationPromises.push(
          tx
            .update(paymentsReceivedTable)
            .set({ isReceiptGenerated: true, updatedAt: new Date() })
            .where(inArray(paymentsReceivedTable.id, newPaymentIdsInReceipt))
        );
      }

      if (itemsToDeleteIds.length > 0) {
        modificationPromises.push(
          tx
            .delete(receiptItemsTable)
            .where(inArray(receiptItemsTable.id, itemsToDeleteIds))
        );
      }

      if (itemsToInsert.length > 0) {
        const insertData = itemsToInsert.map((item) => ({
          ...item,
          receiptId: id,
          invoiceNumber: item.invoiceNumber || null,
          invoiceDate: item.invoiceDate || null,
          balanceDue: item.balanceDue || null,
          saleId: item.saleId || null,
          incomeCategoryId: item.incomeCategoryId || null,
          paymentMethod: item.paymentMethod as PaymentMethod,
        }));
        modificationPromises.push(
          tx.insert(receiptItemsTable).values(insertData)
        );
      }

      for (const item of itemsToUpdate) {
        modificationPromises.push(
          tx
            .update(receiptItemsTable)
            .set({
              paymentReceivedId: item.paymentReceivedId,
              invoiceNumber: item.invoiceNumber || null,
              invoiceDate: item.invoiceDate || null,
              amountDue: item.amountDue,
              amountReceived: item.amountReceived,
              balanceDue: item.balanceDue || null,
              paymentMethod: item.paymentMethod as PaymentMethod,
              saleId: item.saleId || null,
              incomeCategoryId: item.incomeCategoryId || null,
              updatedAt: new Date(),
            })
            .where(eq(receiptItemsTable.id, item.id))
        );
      }

      await Promise.all(modificationPromises);

      return { receipt: updatedReceipt };
    });

    revalidatePath("/accounting-and-finance/income/receipts");
    revalidatePath("/accounting-and-finance/income");

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating receipt record:", error);
    throw new Error(error.message || "Failed to update receipt record.");
  }
};

export const softDeleteReceipt = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentReceipt = await tx
        .select({
          id: receiptsTable.id,
          receiptNumber: receiptsTable.receiptNumber,
        })
        .from(receiptsTable)
        .where(eq(receiptsTable.id, id))
        .then((res) => res[0]);

      if (!currentReceipt) {
        throw new Error("Receipt record not found.");
      }

      const linkedPaymentIds = await tx
        .select({ paymentId: receiptItemsTable.paymentReceivedId })
        .from(receiptItemsTable)
        .where(eq(receiptItemsTable.receiptId, id));

      const paymentIdsToReset = linkedPaymentIds.map((item) => item.paymentId);

      // Deactivate the receipt record
      const [updatedReceipt] = await tx
        .update(receiptsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(receiptsTable.id, id))
        .returning();

      // soft delete the receipt items too:
      await tx
        .update(receiptItemsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(receiptItemsTable.receiptId, id));

      if (paymentIdsToReset.length > 0) {
        await tx
          .update(paymentsReceivedTable)
          .set({ isReceiptGenerated: false, updatedAt: new Date() })
          .where(inArray(paymentsReceivedTable.id, paymentIdsToReset));
      }

      return updatedReceipt;
    });

    revalidatePath("/accounting-and-finance/income/receipts");
    revalidatePath("/accounting-and-finance/income");

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting receipt record:", error);
    throw new Error(error.message || "Failed to deactivate receipt record.");
  }
};

export const generateReceiptNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastReceipt = await tx
        .select({ receiptNumber: receiptsTable.receiptNumber })
        .from(receiptsTable)
        .where(sql`receipt_number LIKE ${`NBSINV:${year}/${month}/%`}`)
        .orderBy(desc(receiptsTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastReceipt.length > 0) {
        const lastReferenceNumber = lastReceipt[0].receiptNumber;
        const lastSequence = parseInt(
          lastReferenceNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `NBSINV:${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating receipt number:", error);
    throw error;
  }
};
