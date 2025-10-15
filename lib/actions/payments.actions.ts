/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import {
  IncomeFilters,
  IncomeFormValidation,
  IncomeFormValues,
} from "../validation";
import {
  accountsTable,
  chartOfAccountsTable,
  customersTable,
  incomeCategoriesTable,
  paymentsReceivedTable,
  salesTable,
} from "@/drizzle/schema";
import {
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
        ilike(customersTable.name, searchTerm), // Needs join
        ilike(salesTable.invoiceNumber, searchTerm), // Needs join
        ilike(incomeCategoriesTable.name, searchTerm), // Needs join
        ilike(accountsTable.name, searchTerm) // Needs join
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
  const parsedValues = IncomeFormValidation.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Income data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

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
            eq(accountsTable.id, parsedValues.data.receivingAccountId),
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
      if (parsedValues.data.saleId) {
        if (!parsedValues.data.customerId) {
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
            and(
              eq(salesTable.id, parsedValues.data.saleId),
              eq(salesTable.isActive, true)
            )
          );
        if (!sale) {
          throw new Error("Linked Sale not found or is inactive.");
        }
        if (sale.customerId !== parsedValues.data.customerId) {
          throw new Error(
            "The selected customer does not match the customer on the linked sale."
          );
        }

        const [customer] = await tx
          .select({ name: customersTable.name })
          .from(customersTable)
          .where(eq(customersTable.id, parsedValues.data.customerId));
        if (customer) {
          customerName = customer.name;
        }
        salesInvoiceNumber = sale.invoiceNumber;

        salesAmountDue =
          parseFloat(sale.totalAmount as any) -
          parseFloat(sale.amountPaid as any);
        if (parsedValues.data.amountReceived > salesAmountDue + 0.001) {
          // Add a small epsilon for floating point comparison
          throw new Error(
            `Amount received (${parsedValues.data.amountReceived}) exceeds the amount due for the sale (${salesAmountDue}).`
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
      } else if (parsedValues.data.incomeCategoryId) {
        // Logic for other income
        const [incomeCategory] = await tx
          .select({
            id: incomeCategoriesTable.id,
            chartOfAccountsId: incomeCategoriesTable.chartOfAccountsId,
          })
          .from(incomeCategoriesTable)
          .where(
            and(
              eq(incomeCategoriesTable.id, parsedValues.data.incomeCategoryId),
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
          eq(
            paymentsReceivedTable.paymentRefNumber,
            parsedValues.data.paymentRefNumber
          )
        );
      if (existingPaymentWithRef.length > 0) {
        throw new Error("Payment reference number already exists.");
      }

      // 2. Create the Payments Received record
      const [newPayment] = await tx
        .insert(paymentsReceivedTable)
        .values({
          ...parsedValues.data,
          incomeCategoryId: parsedValues.data.incomeCategoryId || null,
          customerId: parsedValues.data.customerId || null,
          saleId: parsedValues.data.saleId || null,
          notes: parsedValues.data.notes || null,
          paymentMethod: parsedValues.data.paymentMethod as PaymentMethod,
        })
        .returning();

      // 3. Update the Receiving Account balance
      const updatedBalance =
        parseFloat(receivingAccount.currentBalance as any) +
        parsedValues.data.amountReceived;
      await tx
        .update(accountsTable)
        .set({ currentBalance: updatedBalance, updatedAt: new Date() })
        .where(eq(accountsTable.id, receivingAccount.id));

      // 4. Update Sale's amountPaid and paymentStatus if linked to a sale
      if (parsedValues.data.saleId) {
        const sale = await tx
          .select()
          .from(salesTable)
          .where(eq(salesTable.id, parsedValues.data.saleId))
          .then((res) => res[0]);

        if (sale) {
          const newAmountPaid =
            parseFloat(sale.amountPaid as any) +
            parsedValues.data.amountReceived;
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
            .where(eq(salesTable.id, parsedValues.data.saleId))
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
        description: parsedValues.data.saleId
          ? `Payment for Sale ${salesInvoiceNumber}`
          : `Income received: ${newPayment.paymentRefNumber}`,
        lines: [
          {
            chartOfAccountId: receivingAccount.chartOfAccountsId!, // Debit cash/bank account
            debit: parsedValues.data.amountReceived,
            credit: 0,
            memo: `Funds received into ${receivingAccount.name}`,
          },
          {
            chartOfAccountId: incomeCategoryCoAId!, // Credit Accounts Receivable (for sales) or Revenue Account (for other income)
            debit: 0,
            credit: parsedValues.data.amountReceived,
            memo: parsedValues.data.saleId
              ? `Payment from ${customerName} for Sale ${salesInvoiceNumber}`
              : `Credit to income category`,
          },
        ],
      });

      return {
        payment: newPayment,
        updatedSale: updatedSale, // Include updated sale if relevant
      };
    });

    revalidatePath("/income");
    revalidatePath("/accounting-and-finance/income-tracker");
    if (parsedValues.data.saleId) {
      revalidatePath(`/sales/${parsedValues.data.saleId}`); // Revalidate sales page if a sale was updated
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
  values: Partial<IncomeFormValues>,
  userId: string
) => {
  const parsedValues = IncomeFormValidation.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Income data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

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
        parsedValues.data.receivingAccountId &&
        parsedValues.data.receivingAccountId !==
          currentIncome.receivingAccountId
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
              eq(accountsTable.id, parsedValues.data.receivingAccountId),
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
        parsedValues.data.saleId !== undefined
          ? parsedValues.data.saleId
          : currentIncome.saleId;
      const newIncomeCategoryId =
        parsedValues.data.incomeCategoryId !== undefined
          ? parsedValues.data.incomeCategoryId
          : currentIncome.incomeCategoryId;
      const newCustomerId =
        parsedValues.data.customerId !== undefined
          ? parsedValues.data.customerId
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
          parsedValues.data.amountReceived !== undefined
            ? parsedValues.data.amountReceived
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
        parsedValues.data.paymentRefNumber &&
        parsedValues.data.paymentRefNumber !== currentIncome.paymentRefNumber
      ) {
        const existingRef = await tx
          .select({ id: paymentsReceivedTable.id })
          .from(paymentsReceivedTable)
          .where(
            and(
              eq(
                paymentsReceivedTable.paymentRefNumber,
                parsedValues.data.paymentRefNumber
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
        parsedValues.data.amountReceived !== undefined
          ? parsedValues.data.amountReceived
          : oldAmount;

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
            parsedValues.data.receivingAccountId ||
              currentIncome.receivingAccountId
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
          ...parsedValues.data,
          notes:
            parsedValues.data.notes === null
              ? null
              : parsedValues.data.notes || currentIncome.notes,
          customerId: newCustomerId,
          saleId: newSaleId,
          incomeCategoryId: newIncomeCategoryId,
          paymentMethod: parsedValues.data.paymentMethod as PaymentMethod,
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
      await createJournalEntry({
        tx,
        entryDate: new Date(), // Use current date for adjustment entry
        referenceType: JournalEntryReferenceType.ADJUSTMENT,
        referenceId: updatedIncome.id,
        userId,
        description: `Adjustment for income: ${updatedIncome.paymentRefNumber} (ID: ${updatedIncome.id})`,
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
            memo: `New: adjust ${newIncomeAccountCoAIdFromCategory} for income ${updatedIncome.paymentRefNumber}`,
          },
        ],
      });

      return { payment: updatedIncome, updatedSale: updatedSale };
    });

    revalidatePath("/income");
    revalidatePath("/accounting-and-finance/income-tracker");
    revalidatePath(`/accounting-and-finance/income-tracker/${id}`);
    if (parsedValues.data.saleId) {
      revalidatePath(`/sales/${parsedValues.data.saleId}`);
    }
    if (
      result.updatedSale &&
      result.updatedSale.id !== parsedValues.data.saleId
    ) {
      // Revalidate original sale page if it was unlinked/changed
      revalidatePath(`/sales/${result.updatedSale.id}`);
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
        description: `Reversal of income: ${updatedIncome.paymentRefNumber} (ID: ${updatedIncome.id})`,
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

    revalidatePath("/income");
    revalidatePath("/accounting-and-finance/income-tracker");
    if (result.saleId) {
      // If the original income was linked to a sale
      revalidatePath(`/sales/${result.saleId}`);
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
