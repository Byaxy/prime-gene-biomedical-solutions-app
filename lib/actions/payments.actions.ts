/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import {
  IncomeFilters,
  IncomeFormValues,
  IncomeTrackerFilters,
} from "../validation";
import {
  accountsTable,
  chartOfAccountsTable,
  customersTable,
  incomeCategoriesTable,
  paymentsReceivedTable,
  quotationsTable,
  salesTable,
} from "@/drizzle/schema";
import {
  DateRange,
  JournalEntryReferenceType,
  PaymentMethod,
  PaymentStatus,
} from "@/types";
import { db } from "@/drizzle/db";
import { createJournalEntry } from "./accounting.actions";
import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";

const buildIncomeFilterConditions = (filters: IncomeFilters) => {
  const conditions = [];

  conditions.push(eq(paymentsReceivedTable.isActive, true));

  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(paymentsReceivedTable.paymentRefNumber, searchTerm),
        ilike(paymentsReceivedTable.notes, searchTerm),
        ilike(customersTable.name, searchTerm),
        ilike(salesTable.invoiceNumber, searchTerm),
        ilike(incomeCategoriesTable.name, searchTerm),
        ilike(accountsTable.name, searchTerm)
      )
    );
  }

  if (filters.customerId) {
    conditions.push(eq(paymentsReceivedTable.customerId, filters.customerId));
  }
  if (filters.saleId) {
    conditions.push(eq(paymentsReceivedTable.saleId, filters.saleId));
  }
  if (filters.incomeCategoryId) {
    conditions.push(
      eq(paymentsReceivedTable.incomeCategoryId, filters.incomeCategoryId)
    );
  }
  if (filters.receivingAccountId) {
    conditions.push(
      eq(paymentsReceivedTable.receivingAccountId, filters.receivingAccountId)
    );
  }
  if (filters.paymentMethod) {
    conditions.push(
      eq(
        paymentsReceivedTable.paymentMethod,
        filters.paymentMethod as PaymentMethod
      )
    );
  }

  // Date range filters
  if (filters.paymentDate_start) {
    conditions.push(
      gte(
        paymentsReceivedTable.paymentDate,
        new Date(filters.paymentDate_start)
      )
    );
  }
  if (filters.paymentDate_end) {
    conditions.push(
      lte(paymentsReceivedTable.paymentDate, new Date(filters.paymentDate_end))
    );
  }

  // Amount range filters
  if (filters.amount_min !== undefined) {
    conditions.push(
      gte(paymentsReceivedTable.amountReceived, filters.amount_min)
    );
  }
  if (filters.amount_max !== undefined) {
    conditions.push(
      lte(paymentsReceivedTable.amountReceived, filters.amount_max)
    );
  }

  return conditions;
};

// Record Income (Payments Received)
export const recordIncome = async (
  values: IncomeFormValues,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Validate existence and status of foreign key entities
      const [receivingAccount] = await tx
        .select({
          id: accountsTable.id,
          chartOfAccountsId: accountsTable.chartOfAccountsId,
          currentBalance: accountsTable.currentBalance,
          name: accountsTable.name,
        })
        .from(accountsTable)
        .where(
          and(
            eq(accountsTable.id, values.receivingAccountId),
            eq(accountsTable.isActive, true)
          )
        );
      if (!receivingAccount) {
        throw new Error("Receiving Account not found or is inactive.");
      }
      if (receivingAccount.chartOfAccountsId === null) {
        throw new Error(
          "Receiving Account must be linked to a Chart of Accounts entry."
        );
      }

      let incomeCategoryCoAId: string | null = null;
      let salesAmountDue: number | null = null;
      let updatedSale: typeof salesTable.$inferSelect | null = null;
      let customerName: string | undefined;
      let salesInvoiceNumber: string | undefined;

      // Logic for sales payments
      if (values.saleId) {
        if (!values.customerId) {
          // Zod should catch this, but defensive check
          throw new Error("Customer ID is required for sales-related income.");
        }
        const [sale] = await tx
          .select({
            id: salesTable.id,
            customerId: salesTable.customerId,
            amountPaid: salesTable.amountPaid,
            totalAmount: salesTable.totalAmount,
            invoiceNumber: salesTable.invoiceNumber,
            isActive: salesTable.isActive,
          })
          .from(salesTable)
          .where(
            and(eq(salesTable.id, values.saleId), eq(salesTable.isActive, true))
          );
        if (!sale) {
          throw new Error("Linked Sale not found or is inactive.");
        }
        if (sale.customerId !== values.customerId) {
          throw new Error(
            "The selected customer does not match the customer on the linked sale."
          );
        }

        const [customer] = await tx
          .select({ name: customersTable.name })
          .from(customersTable)
          .where(eq(customersTable.id, values.customerId));
        if (customer) {
          customerName = customer.name;
        }
        salesInvoiceNumber = sale.invoiceNumber;

        salesAmountDue =
          parseFloat(sale.totalAmount as any) -
          parseFloat(sale.amountPaid as any);
        if (values.amountReceived > salesAmountDue + 0.001) {
          // Add a small epsilon for floating point comparison
          throw new Error(
            `Amount received (${values.amountReceived}) exceeds the amount due for the sale (${salesAmountDue}).`
          );
        }

        // Get the default Accounts Receivable CoA for sales
        const [accountsReceivableCoA] = await tx
          .select({ id: chartOfAccountsTable.id })
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(chartOfAccountsTable.accountName, "Accounts Receivable"),
              eq(chartOfAccountsTable.accountType, "asset")
            )
          ); // Assuming a standard 'Accounts Receivable' account name
        if (!accountsReceivableCoA) {
          throw new Error(
            "Default 'Accounts Receivable' Chart of Account not found. Please configure it."
          );
        }
        incomeCategoryCoAId = accountsReceivableCoA.id;
      } else if (values.incomeCategoryId) {
        // Logic for other income
        const [incomeCategory] = await tx
          .select({
            id: incomeCategoriesTable.id,
            chartOfAccountsId: incomeCategoriesTable.chartOfAccountsId,
          })
          .from(incomeCategoriesTable)
          .where(
            and(
              eq(incomeCategoriesTable.id, values.incomeCategoryId),
              eq(incomeCategoriesTable.isActive, true)
            )
          );
        if (!incomeCategory) {
          throw new Error("Income Category not found or is inactive.");
        }
        if (incomeCategory.chartOfAccountsId === null) {
          throw new Error(
            "Income Category must be linked to a Chart of Accounts entry."
          );
        }
        incomeCategoryCoAId = incomeCategory.chartOfAccountsId;
      } else {
        throw new Error(
          "Either a Sale or an Income Category must be specified."
        );
      }

      // Check for unique payment reference number
      const existingPaymentWithRef = await tx
        .select({ id: paymentsReceivedTable.id })
        .from(paymentsReceivedTable)
        .where(
          eq(paymentsReceivedTable.paymentRefNumber, values.paymentRefNumber)
        );
      if (existingPaymentWithRef.length > 0) {
        throw new Error("Payment reference number already exists.");
      }

      // 2. Create the Payments Received record
      const [newPayment] = await tx
        .insert(paymentsReceivedTable)
        .values({
          ...values,
          incomeCategoryId: values.incomeCategoryId || null,
          customerId: values.customerId || null,
          saleId: values.saleId || null,
          notes: values.notes || null,
          paymentMethod: values.paymentMethod as PaymentMethod,
        })
        .returning();

      // 3. Update the Receiving Account balance
      const updatedBalance =
        parseFloat(receivingAccount.currentBalance as any) +
        values.amountReceived;
      await tx
        .update(accountsTable)
        .set({ currentBalance: updatedBalance, updatedAt: new Date() })
        .where(eq(accountsTable.id, receivingAccount.id));

      // 4. Update Sale's amountPaid and paymentStatus if linked to a sale
      if (values.saleId) {
        const sale = await tx
          .select()
          .from(salesTable)
          .where(eq(salesTable.id, values.saleId))
          .then((res) => res[0]);

        if (sale) {
          const newAmountPaid =
            parseFloat(sale.amountPaid as any) + values.amountReceived;
          let newPaymentStatus: PaymentStatus = PaymentStatus.Pending;

          if (newAmountPaid >= parseFloat(sale.totalAmount as any) - 0.001) {
            // Account for floating point precision
            newPaymentStatus = PaymentStatus.Paid;
          } else if (newAmountPaid > 0) {
            newPaymentStatus = PaymentStatus.Partial;
          }

          [updatedSale] = await tx
            .update(salesTable)
            .set({
              amountPaid: newAmountPaid,
              paymentStatus: newPaymentStatus,
              updatedAt: new Date(),
            })
            .where(eq(salesTable.id, values.saleId))
            .returning();
        }
      }

      // 5. Create Journal Entries for double-entry accounting
      await createJournalEntry({
        tx,
        entryDate: newPayment.paymentDate,
        referenceType: JournalEntryReferenceType.PAYMENT_RECEIVED,
        referenceId: newPayment.id,
        userId,
        description: values.saleId
          ? `Payment for Sale ${salesInvoiceNumber}`
          : `Income received: ${newPayment.paymentRefNumber}`,
        lines: [
          {
            chartOfAccountId: receivingAccount.chartOfAccountsId!, // Debit cash/bank account
            debit: values.amountReceived,
            credit: 0,
            memo: `Funds received into ${receivingAccount.name}`,
          },
          {
            chartOfAccountId: incomeCategoryCoAId!, // Credit Accounts Receivable (for sales) or Revenue Account (for other income)
            debit: 0,
            credit: values.amountReceived,
            memo: values.saleId
              ? `Payment from ${customerName} for Sale ${salesInvoiceNumber}`
              : `Credit to income category`,
          },
        ],
      });

      return {
        payment: newPayment,
        updatedSale: updatedSale,
      };
    });

    revalidatePath("/accounting-and-finance/income");
    if (values.saleId) {
      revalidatePath(`/sales`);
    }
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error recording income:", error);
    throw new Error(error.message || "Failed to record income.");
  }
};

// Get all Income (Payments Received) with pagination and filtering
export const getIncome = async (
  page: number = 0,
  limit: number = 10,
  getAll: boolean = false,
  filters?: IncomeFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      let query = tx
        .select({
          payment: paymentsReceivedTable,
          customer: customersTable,
          sale: salesTable,
          incomeCategory: incomeCategoriesTable,
          receivingAccount: accountsTable,
        })
        .from(paymentsReceivedTable)
        .leftJoin(
          customersTable,
          eq(paymentsReceivedTable.customerId, customersTable.id)
        )
        .leftJoin(salesTable, eq(paymentsReceivedTable.saleId, salesTable.id))
        .leftJoin(
          incomeCategoriesTable,
          eq(paymentsReceivedTable.incomeCategoryId, incomeCategoriesTable.id)
        )
        .leftJoin(
          accountsTable,
          eq(paymentsReceivedTable.receivingAccountId, accountsTable.id)
        )
        .where(eq(paymentsReceivedTable.isActive, true))
        .$dynamic();

      const conditions = buildIncomeFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(paymentsReceivedTable.paymentDate));

      let totalCount = 0;
      if (!getAll) {
        // For total count, ensure we apply all conditions
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(paymentsReceivedTable)
          .leftJoin(
            customersTable,
            eq(paymentsReceivedTable.customerId, customersTable.id)
          )
          .leftJoin(salesTable, eq(paymentsReceivedTable.saleId, salesTable.id))
          .leftJoin(
            incomeCategoriesTable,
            eq(paymentsReceivedTable.incomeCategoryId, incomeCategoriesTable.id)
          )
          .leftJoin(
            accountsTable,
            eq(paymentsReceivedTable.receivingAccountId, accountsTable.id)
          )
          .where(and(eq(paymentsReceivedTable.isActive, true), ...conditions));
        totalCount = countResult?.count || 0;

        query = query.limit(limit).offset(page * limit);
      } else {
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(paymentsReceivedTable)
          .leftJoin(
            customersTable,
            eq(paymentsReceivedTable.customerId, customersTable.id)
          )
          .leftJoin(salesTable, eq(paymentsReceivedTable.saleId, salesTable.id))
          .leftJoin(
            incomeCategoriesTable,
            eq(paymentsReceivedTable.incomeCategoryId, incomeCategoriesTable.id)
          )
          .leftJoin(
            accountsTable,
            eq(paymentsReceivedTable.receivingAccountId, accountsTable.id)
          )
          .where(and(eq(paymentsReceivedTable.isActive, true), ...conditions));
        totalCount = countResult?.count || 0;
      }

      const incomeRecords = await query;

      return {
        documents: incomeRecords,
        total: totalCount,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error: any) {
    console.error("Error fetching Income records:", error);
    throw new Error(error.message || "Failed to fetch income records.");
  }
};

// Get a single Income record by ID
export const getIncomeById = async (id: string) => {
  try {
    const income = await db
      .select({
        payment: paymentsReceivedTable,
        customer: customersTable,
        sale: salesTable,
        incomeCategory: incomeCategoriesTable,
        receivingAccount: accountsTable,
      })
      .from(paymentsReceivedTable)
      .leftJoin(
        customersTable,
        eq(paymentsReceivedTable.customerId, customersTable.id)
      )
      .leftJoin(salesTable, eq(paymentsReceivedTable.saleId, salesTable.id))
      .leftJoin(
        incomeCategoriesTable,
        eq(paymentsReceivedTable.incomeCategoryId, incomeCategoriesTable.id)
      )
      .leftJoin(
        accountsTable,
        eq(paymentsReceivedTable.receivingAccountId, accountsTable.id)
      )
      .where(
        and(
          eq(paymentsReceivedTable.id, id),
          eq(paymentsReceivedTable.isActive, true)
        )
      )
      .then((res) => res[0]);

    return parseStringify(income);
  } catch (error: any) {
    console.error("Error fetching Income record by ID:", error);
    throw new Error(error.message || "Failed to fetch income record by ID.");
  }
};

// Update an Income record
export const updateIncome = async (
  id: string,
  values: IncomeFormValues,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentIncome = await tx
        .select({
          id: paymentsReceivedTable.id,
          amountReceived: paymentsReceivedTable.amountReceived,
          receivingAccountId: paymentsReceivedTable.receivingAccountId,
          incomeCategoryId: paymentsReceivedTable.incomeCategoryId,
          saleId: paymentsReceivedTable.saleId,
          customerId: paymentsReceivedTable.customerId,
          paymentRefNumber: paymentsReceivedTable.paymentRefNumber,
          paymentDate: paymentsReceivedTable.paymentDate,
          notes: paymentsReceivedTable.notes,
        })
        .from(paymentsReceivedTable)
        .where(eq(paymentsReceivedTable.id, id))
        .then((res) => res[0]);

      if (!currentIncome) {
        throw new Error("Income record not found.");
      }

      // Re-validate receiving account if updated, and check balance impact
      let newReceivingAccountCoAId: string | undefined;
      let oldReceivingAccountCoAId: string | undefined = undefined;

      const currentReceivingAccount = await tx
        .select({
          id: accountsTable.id,
          chartOfAccountsId: accountsTable.chartOfAccountsId,
          currentBalance: accountsTable.currentBalance,
          name: accountsTable.name,
        })
        .from(accountsTable)
        .where(eq(accountsTable.id, currentIncome.receivingAccountId))
        .then((res) => res[0]);

      if (!currentReceivingAccount) {
        throw new Error("Original receiving account not found or is inactive.");
      }
      oldReceivingAccountCoAId =
        currentReceivingAccount.chartOfAccountsId ?? undefined;

      if (
        values.receivingAccountId &&
        values.receivingAccountId !== currentIncome.receivingAccountId
      ) {
        const [newReceivingAccount] = await tx
          .select({
            id: accountsTable.id,
            chartOfAccountsId: accountsTable.chartOfAccountsId,
            currentBalance: accountsTable.currentBalance,
          })
          .from(accountsTable)
          .where(
            and(
              eq(accountsTable.id, values.receivingAccountId),
              eq(accountsTable.isActive, true)
            )
          );
        if (!newReceivingAccount) {
          throw new Error("New Receiving Account not found or is inactive.");
        }
        newReceivingAccountCoAId =
          newReceivingAccount.chartOfAccountsId ?? undefined;
      } else {
        newReceivingAccountCoAId =
          currentReceivingAccount.chartOfAccountsId ?? undefined;
      }

      // Validate income/sale linking consistency if changed
      const newSaleId =
        values.saleId !== undefined ? values.saleId : currentIncome.saleId;
      const newIncomeCategoryId =
        values.incomeCategoryId !== undefined
          ? values.incomeCategoryId
          : currentIncome.incomeCategoryId;
      const newCustomerId =
        values.customerId !== undefined
          ? values.customerId
          : currentIncome.customerId;

      let oldIncomeAccountCoAId: string | null = null;
      let newIncomeAccountCoAIdFromCategory: string | null = null;
      let newSaleAmountDue: number | null = null;
      let updatedSale: typeof salesTable.$inferSelect | null = null;

      // Determine old income CoA ID for reversal
      if (currentIncome.saleId) {
        const [accountsReceivableCoA] = await tx
          .select({ id: chartOfAccountsTable.id })
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(chartOfAccountsTable.accountName, "Accounts Receivable"),
              eq(chartOfAccountsTable.accountType, "asset")
            )
          );
        oldIncomeAccountCoAId =
          accountsReceivableCoA?.id ||
          throwError("Accounts Receivable CoA not found.");
      } else if (currentIncome.incomeCategoryId) {
        const oldCat = await tx
          .select({
            chartOfAccountsId: incomeCategoriesTable.chartOfAccountsId,
          })
          .from(incomeCategoriesTable)
          .where(eq(incomeCategoriesTable.id, currentIncome.incomeCategoryId))
          .then((res) => res[0]);
        oldIncomeAccountCoAId =
          oldCat?.chartOfAccountsId ||
          throwError("Original Income Category CoA not found.");
      } else {
        throwError("Original income type (sale or category) not identifiable.");
      }

      // Logic for new/updated sale linkage
      if (newSaleId) {
        if (!newCustomerId) {
          throw new Error("Customer is required when linking to a sale.");
        }
        const sale = await tx
          .select()
          .from(salesTable)
          .where(
            and(eq(salesTable.id, newSaleId), eq(salesTable.isActive, true))
          )
          .then((res) => res[0]);
        if (!sale) {
          throw new Error("Linked Sale not found or is inactive.");
        }
        if (sale.customerId !== newCustomerId) {
          throw new Error(
            "The selected customer does not match the customer on the linked sale."
          );
        }

        newSaleAmountDue =
          parseFloat(sale.totalAmount as any) -
          parseFloat(sale.amountPaid as any) +
          parseFloat(currentIncome.amountReceived as any); // Add back old amount for recalculation
        const effectiveNewAmount =
          values.amountReceived !== undefined
            ? values.amountReceived
            : currentIncome.amountReceived;
        if (effectiveNewAmount > newSaleAmountDue + 0.001) {
          throw new Error(
            `Amount received (${effectiveNewAmount}) exceeds the adjusted amount due for the sale (${newSaleAmountDue}).`
          );
        }

        const [accountsReceivableCoA] = await tx
          .select({ id: chartOfAccountsTable.id })
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(chartOfAccountsTable.accountName, "Accounts Receivable"),
              eq(chartOfAccountsTable.accountType, "asset")
            )
          );
        newIncomeAccountCoAIdFromCategory =
          accountsReceivableCoA?.id ||
          throwError(
            "Default 'Accounts Receivable' Chart of Account not found."
          );
      } else if (newIncomeCategoryId) {
        const incomeCategory = await tx
          .select({
            id: incomeCategoriesTable.id,
            chartOfAccountsId: incomeCategoriesTable.chartOfAccountsId,
          })
          .from(incomeCategoriesTable)
          .where(
            and(
              eq(incomeCategoriesTable.id, newIncomeCategoryId),
              eq(incomeCategoriesTable.isActive, true)
            )
          )
          .then((res) => res[0]);
        if (!incomeCategory) {
          throw new Error("New Income Category not found or is inactive.");
        }
        newIncomeAccountCoAIdFromCategory = incomeCategory.chartOfAccountsId;
      } else {
        throw new Error(
          "Either a Sale or an Income Category must be specified for the updated income record."
        );
      }

      // Check for unique payment reference number if updated
      if (
        values.paymentRefNumber &&
        values.paymentRefNumber !== currentIncome.paymentRefNumber
      ) {
        const existingRef = await tx
          .select({ id: paymentsReceivedTable.id })
          .from(paymentsReceivedTable)
          .where(
            and(
              eq(
                paymentsReceivedTable.paymentRefNumber,
                values.paymentRefNumber
              ),
              sql`${paymentsReceivedTable.id} != ${id}`
            )
          );
        if (existingRef.length > 0) {
          throw new Error(
            "Payment reference number already exists for another income record."
          );
        }
      }

      // Adjust old account balances and update sale if applicable
      const oldAmount = parseFloat(currentIncome.amountReceived as any);
      const newAmount =
        values.amountReceived !== undefined ? values.amountReceived : oldAmount;

      // Restore old receiving account balance
      await tx
        .update(accountsTable)
        .set({
          currentBalance:
            parseFloat(currentReceivingAccount.currentBalance as any) -
            oldAmount,
          updatedAt: new Date(),
        })
        .where(eq(accountsTable.id, currentIncome.receivingAccountId));

      // If old payment was linked to a sale, reverse its impact
      if (currentIncome.saleId) {
        const saleToUpdate = await tx
          .select()
          .from(salesTable)
          .where(eq(salesTable.id, currentIncome.saleId))
          .then((res) => res[0]);
        if (saleToUpdate) {
          const revertedAmountPaid =
            parseFloat(saleToUpdate.amountPaid as any) - oldAmount;
          let revertedPaymentStatus = PaymentStatus.Pending;
          if (
            revertedAmountPaid >=
            parseFloat(saleToUpdate.totalAmount as any) - 0.001
          ) {
            revertedPaymentStatus = PaymentStatus.Paid;
          } else if (revertedAmountPaid > 0) {
            revertedPaymentStatus = PaymentStatus.Partial;
          }
          await tx
            .update(salesTable)
            .set({
              amountPaid: revertedAmountPaid,
              paymentStatus: revertedPaymentStatus,
              updatedAt: new Date(),
            })
            .where(eq(salesTable.id, currentIncome.saleId));
        }
      }

      // Apply new amount to the new receiving account
      const targetReceivingAccount = await tx
        .select({
          id: accountsTable.id,
          currentBalance: accountsTable.currentBalance,
          name: accountsTable.name,
        })
        .from(accountsTable)
        .where(
          eq(
            accountsTable.id,
            values.receivingAccountId || currentIncome.receivingAccountId
          )
        )
        .then((res) => res[0]);

      if (!targetReceivingAccount)
        throw new Error("Target receiving account for update not found.");

      await tx
        .update(accountsTable)
        .set({
          currentBalance:
            parseFloat(targetReceivingAccount.currentBalance as any) +
            newAmount,
          updatedAt: new Date(),
        })
        .where(eq(accountsTable.id, targetReceivingAccount.id));

      // Update the Income record
      const [updatedIncome] = await tx
        .update(paymentsReceivedTable)
        .set({
          ...values,
          notes:
            values.notes === null ? null : values.notes || currentIncome.notes,
          customerId: newCustomerId,
          saleId: newSaleId,
          incomeCategoryId: newIncomeCategoryId,
          paymentMethod: values.paymentMethod as PaymentMethod,
          updatedAt: new Date(),
        })
        .where(eq(paymentsReceivedTable.id, id))
        .returning();

      if (!updatedIncome) {
        throw new Error("Income record not found or could not be updated.");
      }

      // If new payment is linked to a sale, update its status
      if (newSaleId) {
        const saleToUpdate = await tx
          .select()
          .from(salesTable)
          .where(eq(salesTable.id, newSaleId))
          .then((res) => res[0]);
        if (saleToUpdate) {
          const newAmountPaid =
            parseFloat(saleToUpdate.amountPaid as any) + newAmount;
          let newPaymentStatus = PaymentStatus.Pending;
          if (
            newAmountPaid >=
            parseFloat(saleToUpdate.totalAmount as any) - 0.001
          ) {
            newPaymentStatus = PaymentStatus.Paid;
          } else if (newAmountPaid > 0) {
            newPaymentStatus = PaymentStatus.Partial;
          }
          [updatedSale] = await tx
            .update(salesTable)
            .set({
              amountPaid: newAmountPaid,
              paymentStatus: newPaymentStatus,
              updatedAt: new Date(),
            })
            .where(eq(salesTable.id, newSaleId))
            .returning();
        }
      }

      // Create an adjustment journal entry
      const descriptionForJournal = newSaleId
        ? `Adjustment for Payment for Sale ${newSaleId}`
        : `Adjustment for Income: ${updatedIncome.paymentRefNumber}`;

      await createJournalEntry({
        tx,
        entryDate: new Date(), // Use current date for adjustment entry
        referenceType: JournalEntryReferenceType.ADJUSTMENT,
        referenceId: updatedIncome.id,
        userId,
        description: descriptionForJournal,
        lines: [
          // Reversal of original income entry
          {
            chartOfAccountId: oldIncomeAccountCoAId!, // Debit original revenue/AR account (reverse income)
            debit: oldAmount,
            credit: 0,
            memo: `Reversal: adjust ${oldIncomeAccountCoAId} for income ${currentIncome.paymentRefNumber}`,
          },
          {
            chartOfAccountId: oldReceivingAccountCoAId!, // Credit original cash/bank account (reverse funds inflow)
            debit: 0,
            credit: oldAmount,
            memo: `Reversal: reduce funds in ${currentReceivingAccount.name}`,
          },
          // New income entry
          {
            chartOfAccountId: newReceivingAccountCoAId!, // Debit new cash/bank account (record funds inflow)
            debit: newAmount,
            credit: 0,
            memo: `New: record funds in ${targetReceivingAccount.name}`,
          },
          {
            chartOfAccountId: newIncomeAccountCoAIdFromCategory!, // Credit new revenue/AR account
            debit: 0,
            credit: newAmount,
            memo: `New: adjust for income ${updatedIncome.paymentRefNumber}`,
          },
        ],
      });

      return { payment: updatedIncome, updatedSale: updatedSale };
    });

    revalidatePath("/accounting-and-finance/income");
    if (values.saleId) {
      revalidatePath(`/sales`);
    }

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating income record:", error);
    throw new Error(error.message || "Failed to update income record.");
  }
};

// Soft delete an Income record
export const softDeleteIncome = async (id: string, userId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentIncome = await tx
        .select({
          id: paymentsReceivedTable.id,
          amountReceived: paymentsReceivedTable.amountReceived,
          receivingAccountId: paymentsReceivedTable.receivingAccountId,
          incomeCategoryId: paymentsReceivedTable.incomeCategoryId,
          saleId: paymentsReceivedTable.saleId,
          paymentRefNumber: paymentsReceivedTable.paymentRefNumber,
        })
        .from(paymentsReceivedTable)
        .where(eq(paymentsReceivedTable.id, id))
        .then((res) => res[0]);

      if (!currentIncome) {
        throw new Error("Income record not found.");
      }

      // Revert the amount from the receiving account
      const [receivingAccount] = await tx
        .select({
          id: accountsTable.id,
          chartOfAccountsId: accountsTable.chartOfAccountsId,
          currentBalance: accountsTable.currentBalance,
          name: accountsTable.name,
        })
        .from(accountsTable)
        .where(eq(accountsTable.id, currentIncome.receivingAccountId));

      if (!receivingAccount) {
        throw new Error("Receiving account linked to income not found.");
      }

      const revertedBalance =
        parseFloat(receivingAccount.currentBalance as any) -
        parseFloat(currentIncome.amountReceived as any);
      if (revertedBalance < 0) {
        // Should ideally not happen if data integrity is maintained, but defensive check
        throw new Error(
          "Insufficient funds in the receiving account to reverse this income. Manual adjustment may be required."
        );
      }
      await tx
        .update(accountsTable)
        .set({ currentBalance: revertedBalance, updatedAt: new Date() })
        .where(eq(accountsTable.id, receivingAccount.id));

      let oldIncomeAccountCoAId: string | null = null;

      // If linked to a sale, revert its impact on salesTable
      if (currentIncome.saleId) {
        const [sale] = await tx
          .select()
          .from(salesTable)
          .where(eq(salesTable.id, currentIncome.saleId));
        if (sale) {
          const newAmountPaid =
            parseFloat(sale.amountPaid as any) -
            parseFloat(currentIncome.amountReceived as any);
          let newPaymentStatus: PaymentStatus = PaymentStatus.Pending;

          if (newAmountPaid >= parseFloat(sale.totalAmount as any) - 0.001) {
            newPaymentStatus = PaymentStatus.Paid;
          } else if (newAmountPaid > 0) {
            newPaymentStatus = PaymentStatus.Partial;
          }

          await tx
            .update(salesTable)
            .set({
              amountPaid: newAmountPaid,
              paymentStatus: newPaymentStatus,
              updatedAt: new Date(),
            })
            .where(eq(salesTable.id, currentIncome.saleId))
            .returning();
        }
        const [accountsReceivableCoA] = await tx
          .select({ id: chartOfAccountsTable.id })
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(chartOfAccountsTable.accountName, "Accounts Receivable"),
              eq(chartOfAccountsTable.accountType, "asset")
            )
          );
        oldIncomeAccountCoAId =
          accountsReceivableCoA?.id ||
          throwError("Accounts Receivable CoA not found for reversal.");
      } else if (currentIncome.incomeCategoryId) {
        const [incomeCategory] = await tx
          .select({
            chartOfAccountsId: incomeCategoriesTable.chartOfAccountsId,
          })
          .from(incomeCategoriesTable)
          .where(eq(incomeCategoriesTable.id, currentIncome.incomeCategoryId));
        oldIncomeAccountCoAId =
          incomeCategory?.chartOfAccountsId ||
          throwError("Income Category CoA not found for reversal.");
      } else {
        throwError("Could not determine original income account for reversal.");
      }

      // Deactivate the income record
      const [updatedIncome] = await tx
        .update(paymentsReceivedTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(paymentsReceivedTable.id, id))
        .returning();

      // Create a reversal journal entry
      await createJournalEntry({
        tx,
        entryDate: new Date(), // Use current date for reversal entry
        referenceType: JournalEntryReferenceType.ADJUSTMENT, // A reversal is a type of adjustment
        referenceId: updatedIncome.id,
        userId,
        description: `Reversal of income: ${updatedIncome.paymentRefNumber}`,
        lines: [
          {
            chartOfAccountId: oldIncomeAccountCoAId!, // Debit original revenue/AR account (reverse income)
            debit: parseFloat(updatedIncome.amountReceived as any),
            credit: 0,
            memo: `Reversal: reduce ${oldIncomeAccountCoAId} for income ${updatedIncome.paymentRefNumber}`,
          },
          {
            chartOfAccountId: receivingAccount.chartOfAccountsId!, // Credit cash/bank account (reverse funds inflow)
            debit: 0,
            credit: parseFloat(updatedIncome.amountReceived as any),
            memo: `Reversal: reduce funds in ${receivingAccount.name}`,
          },
        ],
      });

      return updatedIncome;
    });

    revalidatePath("/accounting-and-finance/income");
    if (result.saleId) {
      // If the original income was linked to a sale
      revalidatePath(`/sales`);
    }
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting income record:", error);
    throw new Error(error.message || "Failed to deactivate income record.");
  }
};

// Helper to throw errors explicitly for async functions
function throwError(message: string): never {
  throw new Error(message);
}

// Generate reference number
export const generatePaymentReferenceNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastPaymnet = await tx
        .select({ paymentRefNumber: paymentsReceivedTable.paymentRefNumber })
        .from(paymentsReceivedTable)
        .where(sql`payment_ref_number LIKE ${`PRN.${year}/${month}/%`}`)
        .orderBy(desc(paymentsReceivedTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastPaymnet.length > 0) {
        const lastReferenceNumber = lastPaymnet[0].paymentRefNumber;
        const lastSequence = parseInt(
          lastReferenceNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `PRN.${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating payment reference number:", error);
    throw error;
  }
};

// Build filter conditions for Income Tracker
const buildIncomeTrackerFilterConditions = (
  filters: Partial<IncomeTrackerFilters>
) => {
  const conditions = [];

  conditions.push(eq(salesTable.isActive, true));

  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(salesTable.invoiceNumber, searchTerm),
        ilike(customersTable.name, searchTerm)
      )
    );
  }

  if (filters.customerId) {
    conditions.push(eq(salesTable.customerId, filters.customerId));
  }
  if (filters.saleId) {
    conditions.push(eq(salesTable.id, filters.saleId));
  }
  if (filters.paymentMethod) {
    conditions.push(
      eq(salesTable.paymentMethod, filters.paymentMethod as PaymentMethod)
    );
  }
  if (filters.amount_min) {
    conditions.push(gte(salesTable.totalAmount, filters.amount_min));
  }
  if (filters.amount_max) {
    conditions.push(lte(salesTable.totalAmount, filters.amount_max));
  }

  if (filters.status && filters.status !== "all") {
    if (filters.status === "open") {
      conditions.push(
        or(
          eq(salesTable.paymentStatus, PaymentStatus.Pending),
          eq(salesTable.paymentStatus, PaymentStatus.Partial)
        )
      );
    } else if (filters.status === "overdue") {
      conditions.push(
        and(
          or(
            eq(salesTable.paymentStatus, PaymentStatus.Pending),
            eq(salesTable.paymentStatus, PaymentStatus.Partial)
          ),
          sql`${salesTable.dueDate} < CURRENT_DATE`
        )
      );
    } else if (filters.status === "paid") {
      conditions.push(eq(salesTable.paymentStatus, PaymentStatus.Paid));
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to start of day for consistent comparison

  const startOfDay = (date: Date) => new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = (date: Date) => new Date(date.setHours(23, 59, 59, 999));

  if (filters.dateRange) {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    switch (filters.dateRange) {
      case DateRange.TODAY:
        startDate = startOfDay(new Date(today));
        endDate = endOfDay(new Date(today));
        break;
      case DateRange.YESTERDAY:
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        startDate = startOfDay(yesterday);
        endDate = endOfDay(yesterday);
        break;
      case DateRange.THIS_WEEK:
        // Sunday as start of week (0 for Sunday, 1 for Monday etc.)
        startDate = startOfDay(
          new Date(today.setDate(today.getDate() - today.getDay()))
        );
        endDate = endOfDay(new Date()); // Up to current moment of today
        break;
      case DateRange.LAST_WEEK:
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        startDate = startOfDay(lastWeekStart);

        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        endDate = endOfDay(lastWeekEnd);
        break;
      case DateRange.LAST_TWO_WEEKS:
        startDate = startOfDay(
          new Date(today.setDate(today.getDate() - today.getDay() - 14))
        );
        endDate = endOfDay(new Date()); // Up to current moment of today
        break;
      case DateRange.THIS_MONTH:
        startDate = startOfDay(
          new Date(today.getFullYear(), today.getMonth(), 1)
        );
        endDate = endOfDay(new Date()); // Up to current moment of today
        break;
      case DateRange.LAST_MONTH:
        startDate = startOfDay(
          new Date(today.getFullYear(), today.getMonth() - 1, 1)
        );
        endDate = endOfDay(
          new Date(today.getFullYear(), today.getMonth(), 0) // Last day of previous month
        );
        break;
      case DateRange.THIS_QUARTER:
        const currentMonth = today.getMonth();
        const startMonthOfQuarter = currentMonth - (currentMonth % 3);
        startDate = startOfDay(
          new Date(today.getFullYear(), startMonthOfQuarter, 1)
        );
        endDate = endOfDay(new Date()); // Up to current moment of today
        break;
      case DateRange.LAST_QUARTER:
        const lastQuarterMonth = today.getMonth() - 3;
        const lastQuarterStartMonth = lastQuarterMonth - (lastQuarterMonth % 3);
        startDate = startOfDay(
          new Date(today.getFullYear(), lastQuarterStartMonth, 1)
        );
        endDate = endOfDay(
          new Date(today.getFullYear(), lastQuarterStartMonth + 3, 0) // Last day of last month of last quarter
        );
        break;
      case DateRange.THIS_YEAR:
        startDate = startOfDay(new Date(today.getFullYear(), 0, 1));
        endDate = endOfDay(new Date()); // Up to current moment of today
        break;
      case DateRange.LAST_YEAR:
        startDate = startOfDay(new Date(today.getFullYear() - 1, 0, 1));
        endDate = endOfDay(new Date(today.getFullYear() - 1, 11, 31));
        break;
      case DateRange.ALL:
      default:
        break;
    }

    if (startDate) conditions.push(gte(salesTable.saleDate, startDate));
    if (endDate) conditions.push(lte(salesTable.saleDate, endDate));
  }
  if (filters.specificDate_start) {
    conditions.push(
      gte(salesTable.saleDate, startOfDay(new Date(filters.specificDate_start)))
    );
  }
  if (filters.specificDate_end) {
    conditions.push(
      lte(salesTable.saleDate, endOfDay(new Date(filters.specificDate_end)))
    );
  }

  return conditions;
};

// Get data for Income Tracker (Accounts Receivable)
export const getIncomeTrackerData = async (
  page: number = 0,
  limit: number = 10,
  filters?: IncomeTrackerFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Base query for filtering and aggregation
      let baseQuery = tx
        .select({
          sale: salesTable,
          customer: customersTable,
          // Aggregate total amount received for this specific sale
          totalReceivedOnSale:
            sql<number>`COALESCE(SUM(${paymentsReceivedTable.amountReceived}), 0)`.as(
              "total_received_on_sale"
            ),
          // Get the ID and reference number of the LATEST payment for this sale
          latestPaymentInfo: sql<{
            id: string | null;
            ref: string | null;
          }>`(
              SELECT json_build_object(
                  'id', pr.id,
                  'ref', pr.payment_ref_number
              )
              FROM ${paymentsReceivedTable} pr
              WHERE pr.sale_id = ${salesTable.id}
              AND pr.is_active = TRUE
              ORDER BY pr.created_at DESC
              LIMIT 1
          )`.as("latest_payment_info"),
        })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        // LEFT JOIN paymentsReceivedTable to sum up all payments for this sale
        .leftJoin(
          paymentsReceivedTable,
          and(
            eq(salesTable.id, paymentsReceivedTable.saleId),
            eq(paymentsReceivedTable.isActive, true)
          )
        )
        .$dynamic();

      const conditions = buildIncomeTrackerFilterConditions(
        filters ?? ({} as IncomeTrackerFilters)
      );
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      // Group by sale and related foreign keys
      baseQuery = baseQuery.groupBy(salesTable.id, customersTable.id);

      baseQuery = baseQuery.orderBy(desc(salesTable.saleDate));

      // 1. Get total count of distinct sales matching filters (before pagination)
      const countQuery = tx
        .select({
          count: sql<number>`count(DISTINCT ${salesTable.id})`.as("count"),
        })
        .from(salesTable)
        .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
        .leftJoin(
          paymentsReceivedTable,
          and(
            eq(salesTable.id, paymentsReceivedTable.saleId),
            eq(paymentsReceivedTable.isActive, true)
          )
        )
        .where(and(...conditions))
        .$dynamic();

      const [totalCountResult] = await countQuery;
      const totalCount = totalCountResult?.count || 0;

      // 2. Apply pagination
      const paginatedQuery = baseQuery.limit(limit).offset(page * limit);
      const incomeRecords = await paginatedQuery;

      const processedRecords = incomeRecords.map((record) => {
        const totalAmount = parseFloat(record.sale.totalAmount as any);
        const amountReceivedAggregated = parseFloat(
          (record.totalReceivedOnSale as any) || "0"
        );
        const openBalance = totalAmount - amountReceivedAggregated;

        // Determine payment status based on calculated amounts
        let paymentStatus: PaymentStatus = (() => {
          const ps = record.sale.paymentStatus as unknown as string | undefined;
          if (!ps) return PaymentStatus.Pending;
          const map: Record<string, PaymentStatus> = {
            paid: PaymentStatus.Paid,
            partial: PaymentStatus.Partial,
            pending: PaymentStatus.Pending,
            due: PaymentStatus.Due,
          };
          return map[ps.toLowerCase()] ?? PaymentStatus.Pending;
        })();

        // Refine payment status based on calculated amounts
        if (totalAmount <= 0.001) {
          paymentStatus = PaymentStatus.Paid;
        } else if (openBalance <= 0.001) {
          paymentStatus = PaymentStatus.Paid;
        } else if (amountReceivedAggregated > 0) {
          paymentStatus = PaymentStatus.Partial;
        } else {
          // Check if overdue
          const dueDate = record.sale.dueDate
            ? new Date(record.sale.dueDate)
            : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (dueDate && dueDate < today) {
            paymentStatus = PaymentStatus.Due;
          } else {
            paymentStatus = PaymentStatus.Pending;
          }
        }

        const latestPaymentInfo = record.latestPaymentInfo as {
          id: string | null;
          ref: string | null;
        } | null;

        return {
          ...record,
          paymentId: latestPaymentInfo?.id || null,
          sale: {
            ...record.sale,
            amountPaid: amountReceivedAggregated.toFixed(2),
          },
          openBalance: openBalance.toFixed(2),
          paymentStatus: paymentStatus,
          lastPaymentRef: latestPaymentInfo?.ref || null,
          isOverdue:
            record.sale.dueDate &&
            new Date(record.sale.dueDate) < new Date() &&
            openBalance > 0.001,
        };
      });

      const salesSummary = await tx
        .select({
          // Unpaid Sales
          totalOpenSalesAmount: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${salesTable.paymentStatus} IN (${PaymentStatus.Pending}, ${PaymentStatus.Partial})
              THEN (${salesTable.totalAmount} - COALESCE(${salesTable.amountPaid}, 0))
              ELSE 0
            END), 0)
          `.as("total_open_sales_amount"),
          countOpenSales: sql<number>`
            COUNT(CASE
              WHEN ${salesTable.paymentStatus} IN (${PaymentStatus.Pending}, ${PaymentStatus.Partial})
              THEN 1
              ELSE NULL
            END)
          `.as("count_open_sales"),

          // Overdue Sales
          totalOverdueSalesAmount: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${salesTable.dueDate} < CURRENT_DATE
              AND ${salesTable.paymentStatus} IN (${PaymentStatus.Pending}, ${PaymentStatus.Partial})
              THEN (${salesTable.totalAmount} - COALESCE(${salesTable.amountPaid}, 0))
              ELSE 0
            END), 0)
          `.as("total_overdue_sales_amount"),
          countOverdueSales: sql<number>`
            COUNT(CASE
              WHEN ${salesTable.dueDate} < CURRENT_DATE
              AND ${salesTable.paymentStatus} IN (${PaymentStatus.Pending}, ${PaymentStatus.Partial})
              THEN 1
              ELSE NULL
            END)
          `.as("count_overdue_sales"),

          // Paid Last 30 Days Sales
          totalPaidLast30DaysAmount: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${salesTable.paymentStatus} = ${PaymentStatus.Paid}
              AND ${salesTable.updatedAt} >= CURRENT_DATE - INTERVAL '30 days'
              THEN ${salesTable.totalAmount}
              ELSE 0
            END), 0)
          `.as("total_paid_last_30_days_amount"),
          countPaidLast30DaysSales: sql<number>`
            COUNT(CASE
              WHEN ${salesTable.paymentStatus} = ${PaymentStatus.Paid}
              AND ${salesTable.updatedAt} >= CURRENT_DATE - INTERVAL '30 days'
              THEN 1
              ELSE NULL
            END)
          `.as("count_paid_last_30_days_sales"),
        })
        .from(salesTable)
        .where(and(eq(salesTable.isActive, true), ...conditions)) // Apply relevant sales conditions
        .then((res) => res[0]);

      // Quotation Summary Stats for "Unbilled"
      // We'll filter quotations based on active status and relevant sales filters
      const quotationConditions = [];
      quotationConditions.push(eq(quotationsTable.isActive, true));
      if (filters?.customerId) {
        quotationConditions.push(
          eq(quotationsTable.customerId, filters.customerId)
        );
      }

      const quotationsSummary = await tx
        .select({
          totalUnbilledQuotationsAmount: sql<number>`
            COALESCE(SUM(${quotationsTable.totalAmount}), 0)
          `.as("total_unbilled_quotations_amount"),
          countUnbilledQuotations: sql<number>`
            COUNT(${quotationsTable.id})
          `.as("count_unbilled_quotations"),
        })
        .from(quotationsTable)
        .where(and(...quotationConditions))
        .then((res) => res[0]);

      return {
        documents: parseStringify(processedRecords),
        total: totalCount,
        summary: parseStringify({
          // --- UNBILLED SECTION ---
          unbilled: {
            amount: parseFloat(
              quotationsSummary.totalUnbilledQuotationsAmount as any
            ).toFixed(2),
            count: quotationsSummary.countUnbilledQuotations || 0,
          },

          // --- UNPAID SECTION ---
          unpaid: {
            amount: parseFloat(
              salesSummary.totalOpenSalesAmount as any
            ).toFixed(2),
            count: salesSummary.countOpenSales || 0,
          },
          overdue: {
            amount: parseFloat(
              salesSummary.totalOverdueSalesAmount as any
            ).toFixed(2),
            count: salesSummary.countOverdueSales || 0,
          },

          // --- PAID SECTION ---
          paidLast30Days: {
            amount: parseFloat(
              salesSummary.totalPaidLast30DaysAmount as any
            ).toFixed(2),
            count: salesSummary.countPaidLast30DaysSales || 0,
          },
        }),
      };
    });

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error fetching Income Tracker data:", error);
    throw new Error(error.message || "Failed to fetch income tracker data.");
  }
};

// Get Income Tracker Summary (for dashboard widgets)
export const getIncomeTrackerSummary = async (
  filters?: Partial<IncomeTrackerFilters>
) => {
  try {
    const conditions = buildIncomeTrackerFilterConditions(
      filters ?? ({} as IncomeTrackerFilters)
    );

    // Sales Summary Stats
    const salesSummary = await db
      .select({
        // Unpaid Sales
        totalOpenSalesAmount: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${salesTable.paymentStatus} IN (${PaymentStatus.Pending}, ${PaymentStatus.Partial})
              THEN (${salesTable.totalAmount} - COALESCE(${salesTable.amountPaid}, 0))
              ELSE 0
            END), 0)
          `.as("total_open_sales_amount"),
        countOpenSales: sql<number>`
            COUNT(CASE
              WHEN ${salesTable.paymentStatus} IN (${PaymentStatus.Pending}, ${PaymentStatus.Partial})
              THEN 1
              ELSE NULL
            END)
          `.as("count_open_sales"),

        // Overdue Sales
        totalOverdueSalesAmount: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${salesTable.dueDate} < CURRENT_DATE
              AND ${salesTable.paymentStatus} IN (${PaymentStatus.Pending}, ${PaymentStatus.Partial})
              THEN (${salesTable.totalAmount} - COALESCE(${salesTable.amountPaid}, 0))
              ELSE 0
            END), 0)
          `.as("total_overdue_sales_amount"),
        countOverdueSales: sql<number>`
            COUNT(CASE
              WHEN ${salesTable.dueDate} < CURRENT_DATE
              AND ${salesTable.paymentStatus} IN (${PaymentStatus.Pending}, ${PaymentStatus.Partial})
              THEN 1
              ELSE NULL
            END)
          `.as("count_overdue_sales"),

        // Paid Last 30 Days Sales
        totalPaidLast30DaysAmount: sql<number>`
            COALESCE(SUM(CASE
              WHEN ${salesTable.paymentStatus} = ${PaymentStatus.Paid}
              AND ${salesTable.updatedAt} >= CURRENT_DATE - INTERVAL '30 days'
              THEN ${salesTable.totalAmount}
              ELSE 0
            END), 0)
          `.as("total_paid_last_30_days_amount"),
        countPaidLast30DaysSales: sql<number>`
            COUNT(CASE
              WHEN ${salesTable.paymentStatus} = ${PaymentStatus.Paid}
              AND ${salesTable.updatedAt} >= CURRENT_DATE - INTERVAL '30 days'
              THEN 1
              ELSE NULL
            END)
          `.as("count_paid_last_30_days_sales"),
      })
      .from(salesTable)
      .where(and(eq(salesTable.isActive, true), ...conditions)) // Apply relevant sales conditions
      .then((res) => res[0]);

    // Quotation Summary Stats for "Unbilled"
    const quotationConditions = [];
    quotationConditions.push(eq(quotationsTable.isActive, true));
    if (filters?.customerId) {
      quotationConditions.push(
        eq(quotationsTable.customerId, filters.customerId)
      );
    }
    const quotationsSummary = await db
      .select({
        totalUnbilledQuotationsAmount: sql<number>`
            COALESCE(SUM(${quotationsTable.totalAmount}), 0)
          `.as("total_unbilled_quotations_amount"),
        countUnbilledQuotations: sql<number>`
            COUNT(${quotationsTable.id})
          `.as("count_unbilled_quotations"),
      })
      .from(quotationsTable)
      .where(and(...quotationConditions))
      .then((res) => res[0]);

    return parseStringify({
      // --- UNBILLED SECTION ---
      unbilled: {
        amount: parseFloat(
          quotationsSummary.totalUnbilledQuotationsAmount as any
        ).toFixed(2),
        count: quotationsSummary.countUnbilledQuotations || 0,
      },

      // --- UNPAID SECTION ---
      unpaid: {
        amount: parseFloat(salesSummary.totalOpenSalesAmount as any).toFixed(2),
        count: salesSummary.countOpenSales || 0,
      },
      overdue: {
        amount: parseFloat(salesSummary.totalOverdueSalesAmount as any).toFixed(
          2
        ),
        count: salesSummary.countOverdueSales || 0,
      },

      // --- PAID SECTION ---
      paidLast30Days: {
        amount: parseFloat(
          salesSummary.totalPaidLast30DaysAmount as any
        ).toFixed(2),
        count: salesSummary.countPaidLast30DaysSales || 0,
      },
      // Removed other fields as per the new requirements
    });
  } catch (error: any) {
    console.error("Error fetching Income Tracker summary:", error);
    throw new Error(error.message || "Failed to fetch income tracker summary.");
  }
};
