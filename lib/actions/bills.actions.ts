/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import {
  accompanyingExpenseTypesTable,
  accountsTable,
  billPaymentAccompanyingExpensesTable,
  billPaymentAccountsTable,
  billPaymentItemsTable,
  billPaymentsTable,
  chartOfAccountsTable,
  expenseCategoriesTable,
  purchaseOrdersTable,
  purchasesTable,
  usersTable,
  vendorsTable,
} from "@/drizzle/schema";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import {
  BillPaymentFormValidation,
  BillPaymentFormValues,
  BillTrackerFilters,
} from "../validation";
import { JournalEntryReferenceType, PaymentStatus } from "@/types";
import { createJournalEntry } from "./accounting.actions";

const buildBillTrackerFilterConditions = (filters: BillTrackerFilters) => {
  const conditions = [];

  // Filter for active purchases by default (assuming tracker focuses on active liabilities/payments)
  conditions.push(eq(purchasesTable.isActive, true));

  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(purchasesTable.purchaseNumber, searchTerm),
        ilike(purchasesTable.vendorInvoiceNumber, searchTerm),
        ilike(vendorsTable.name, searchTerm)
      )
    );
  }

  if (filters.vendorId) {
    conditions.push(eq(purchasesTable.vendorId, filters.vendorId));
  }

  // Handle 'type' filter for the main query
  if (filters.type && filters.type !== "all") {
    if (filters.type === "purchase_orders") {
      conditions.push(eq(purchasesTable.purchaseOrderId, sql`true`)); // This implies a linked PO
      // A more robust check might involve joining purchaseOrdersTable and checking its status
    } else if (filters.type === "open_bills") {
      conditions.push(
        or(
          eq(purchasesTable.paymentStatus, PaymentStatus.Pending),
          eq(purchasesTable.paymentStatus, PaymentStatus.Partial)
        )
      );
    } else if (filters.type === "due_bills") {
      conditions.push(eq(purchasesTable.paymentStatus, PaymentStatus.Due));
    } else if (filters.type === "paid_bill") {
      conditions.push(eq(purchasesTable.paymentStatus, PaymentStatus.Paid));
    }
  }

  // Handle 'status' filter directly on purchasesTable.paymentStatus
  if (filters.status && filters.status !== "all") {
    conditions.push(
      eq(purchasesTable.paymentStatus, filters.status as PaymentStatus)
    );
  }

  // Date range filters
  const today = new Date();
  const startOfDay = (date: Date) => new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = (date: Date) => new Date(date.setHours(23, 59, 59, 999));

  if (filters.dateRange) {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    switch (filters.dateRange) {
      case "today":
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        startDate = startOfDay(yesterday);
        endDate = endOfDay(yesterday);
        break;
      case "one_week":
        startDate = startOfDay(new Date(today.setDate(today.getDate() - 7)));
        endDate = endOfDay(new Date());
        break;
      case "two_weeks":
        startDate = startOfDay(new Date(today.setDate(today.getDate() - 14)));
        endDate = endOfDay(new Date());
        break;
      case "this_month":
        startDate = startOfDay(
          new Date(today.getFullYear(), today.getMonth(), 1)
        );
        endDate = endOfDay(
          new Date(today.getFullYear(), today.getMonth() + 1, 0)
        );
        break;
      case "next_one_week":
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date(today.setDate(today.getDate() + 7)));
        break;
      case "next_two_weeks":
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date(today.setDate(today.getDate() + 14)));
        break;
      case "next_one_month":
        startDate = startOfDay(new Date());
        endDate = endOfDay(
          new Date(today.getFullYear(), today.getMonth() + 2, 0)
        );
        break;
      case "next_one_quarter":
        startDate = startOfDay(new Date());
        endDate = endOfDay(
          new Date(today.getFullYear(), today.getMonth() + 3, 0)
        ); // Approx 3 months
        break;
      case "all":
      default:
        // No date range filter
        break;
    }

    if (startDate) conditions.push(gte(purchasesTable.purchaseDate, startDate));
    if (endDate) conditions.push(lte(purchasesTable.purchaseDate, endDate));
  }

  if (filters.specificDate_start) {
    conditions.push(
      gte(
        purchasesTable.purchaseDate,
        startOfDay(new Date(filters.specificDate_start))
      )
    );
  }
  if (filters.specificDate_end) {
    conditions.push(
      lte(
        purchasesTable.purchaseDate,
        endOfDay(new Date(filters.specificDate_end))
      )
    );
  }

  return conditions;
};

// Pay Bill (Vendor Bill Payment)
export const payBill = async (
  values: BillPaymentFormValues,
  userId: string
) => {
  const parsedValues = BillPaymentFormValidation.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Bill Payment data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Validate existence and status of foreign key entities
      const [vendor] = await tx
        .select({ id: vendorsTable.id })
        .from(vendorsTable)
        .where(
          and(
            eq(vendorsTable.id, parsedValues.data.vendorId),
            eq(vendorsTable.isActive, true)
          )
        );
      if (!vendor) {
        throw new Error("Vendor not found or is inactive.");
      }

      // Check for unique bill reference number
      const existingPaymentWithRef = await tx
        .select({ id: billPaymentsTable.id })
        .from(billPaymentsTable)
        .where(
          eq(
            billPaymentsTable.billReferenceNo,
            parsedValues.data.billReferenceNo
          )
        );
      if (existingPaymentWithRef.length > 0) {
        throw new Error("Bill payment reference number already exists.");
      }

      // Validate and collect CoA IDs for paying accounts
      const payingAccountDetails = await Promise.all(
        parsedValues.data.payingAccounts.map(async (acc) => {
          const [account] = await tx
            .select({
              id: accountsTable.id,
              chartOfAccountsId: accountsTable.chartOfAccountsId,
              currentBalance: accountsTable.currentBalance,
              name: accountsTable.name,
            })
            .from(accountsTable)
            .where(
              and(
                eq(accountsTable.id, acc.payingAccountId),
                eq(accountsTable.isActive, true)
              )
            );
          if (!account) {
            throw new Error(
              `Paying Account '${acc.payingAccountId}' not found or is inactive.`
            );
          }
          if (
            parseFloat(account.currentBalance as any) <
            acc.amountPaidFromAccount
          ) {
            throw new Error(
              `Insufficient funds in account '${account.name}'. Available: ${account.currentBalance}, Required: ${acc.amountPaidFromAccount}.`
            );
          }
          return { ...account, amountToDeduct: acc.amountPaidFromAccount };
        })
      );

      // Validate purchases to pay and calculate total AR debit needed
      let totalPurchasesAmountPaid = 0;
      const accountsPayableCoA =
        (await tx
          .select({ id: chartOfAccountsTable.id })
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(chartOfAccountsTable.accountName, "Accounts Payable"),
              eq(chartOfAccountsTable.accountType, "liability")
            )
          )
          .then((res) => res[0]?.id)) ||
        throwError("Default 'Accounts Payable' Chart of Account not found.");

      await Promise.all(
        parsedValues.data.purchasesToPay.map(async (item) => {
          const [purchase] = await tx
            .select({
              id: purchasesTable.id,
              totalAmount: purchasesTable.totalAmount,
              amountPaid: purchasesTable.amountPaid,
              isActive: purchasesTable.isActive,
            })
            .from(purchasesTable)
            .where(
              and(
                eq(purchasesTable.id, item.purchaseId),
                eq(purchasesTable.isActive, true)
              )
            );
          if (!purchase) {
            throw new Error(
              `Purchase '${item.purchaseId}' not found or is inactive.`
            );
          }
          const outstandingAmount =
            parseFloat(purchase.totalAmount as any) -
            parseFloat(purchase.amountPaid as any);
          if (item.amountToPay > outstandingAmount + 0.001) {
            // Epsilon for floating point
            throw new Error(
              `Amount to pay (${item.amountToPay}) for purchase '${purchase.id}' exceeds outstanding amount (${outstandingAmount}).`
            );
          }
          totalPurchasesAmountPaid += item.amountToPay;
        })
      );

      // Validate accompanying expenses and collect CoA IDs for debit
      const accompanyingExpenseDetails = await Promise.all(
        (parsedValues.data.accompanyingExpenses || []).map(async (exp) => {
          const [accompanyingType] = await tx
            .select({
              id: accompanyingExpenseTypesTable.id,
              defaultExpenseCategoryId:
                accompanyingExpenseTypesTable.defaultExpenseCategoryId,
            })
            .from(accompanyingExpenseTypesTable)
            .where(
              and(
                eq(
                  accompanyingExpenseTypesTable.id,
                  exp.accompanyingExpenseTypeId
                ),
                eq(accompanyingExpenseTypesTable.isActive, true)
              )
            );
          if (!accompanyingType) {
            throw new Error(
              `Accompanying Expense Type '${exp.accompanyingExpenseTypeId}' not found or is inactive.`
            );
          }
          const [expenseCategory] = await tx
            .select({
              chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
            })
            .from(expenseCategoriesTable)
            .where(
              and(
                eq(
                  expenseCategoriesTable.id,
                  accompanyingType.defaultExpenseCategoryId ?? ""
                ),
                eq(expenseCategoriesTable.isActive, true)
              )
            );
          if (!expenseCategory || !expenseCategory.chartOfAccountsId) {
            throw new Error(
              `Default Expense Category for Accompanying Expense Type '${accompanyingType.id}' not found or is inactive.`
            );
          }
          return {
            ...exp,
            chartOfAccountsId: expenseCategory.chartOfAccountsId,
          };
        })
      );

      // 2. Create Bill Payment record
      const [newBillPayment] = await tx
        .insert(billPaymentsTable)
        .values({
          billReferenceNo: parsedValues.data.billReferenceNo,
          paymentDate: parsedValues.data.paymentDate,
          vendorId: parsedValues.data.vendorId,
          totalPaymentAmount: parsedValues.data.totalPaymentAmount, // This is the total outflow
          generalComments: parsedValues.data.generalComments,
          attachments: parsedValues.data.attachments,
          userId, // Get current user ID
        })
        .returning();

      // 3. Create Bill Payment Items (link to purchases)
      if (parsedValues.data.purchasesToPay.length > 0) {
        const billPaymentItemsData = parsedValues.data.purchasesToPay.map(
          (item) => ({
            billPaymentId: newBillPayment.id,
            purchaseId: item.purchaseId,
            amountApplied: item.amountToPay,
          })
        );
        await tx.insert(billPaymentItemsTable).values(billPaymentItemsData);
      }

      // 4. Create Bill Payment Accounts (allocation from multiple accounts)
      if (parsedValues.data.payingAccounts.length > 0) {
        const billPaymentAccountsData = parsedValues.data.payingAccounts.map(
          (acc) => ({
            billPaymentId: newBillPayment.id,
            payingAccountId: acc.payingAccountId,
            amountPaidFromAccount: acc.amountPaidFromAccount,
          })
        );
        await tx
          .insert(billPaymentAccountsTable)
          .values(billPaymentAccountsData);
      }

      // 5. Create Bill Payment Accompanying Expenses
      if (accompanyingExpenseDetails.length > 0) {
        const billPaymentAccompanyingExpensesData =
          accompanyingExpenseDetails.map((exp) => ({
            billPaymentId: newBillPayment.id,
            accompanyingExpenseTypeId: exp.accompanyingExpenseTypeId,
            amount: exp.amount,
            payee: exp.payee,
            comments: exp.comments,
          }));
        await tx
          .insert(billPaymentAccompanyingExpensesTable)
          .values(billPaymentAccompanyingExpensesData);
      }

      // 6. Update accountsTable.currentBalance for all involved payingAccountIds
      await Promise.all(
        payingAccountDetails.map((acc) =>
          tx
            .update(accountsTable)
            .set({
              currentBalance:
                parseFloat(acc.currentBalance as any) - acc.amountToDeduct,
              updatedAt: new Date(),
            })
            .where(eq(accountsTable.id, acc.id))
        )
      );

      // 7. Update purchasesTable.amountPaid and paymentStatus for each purchase item
      const updatedPurchases: (typeof purchasesTable.$inferSelect)[] = [];
      await Promise.all(
        parsedValues.data.purchasesToPay.map(async (item) => {
          const purchase = await tx
            .select()
            .from(purchasesTable)
            .where(eq(purchasesTable.id, item.purchaseId))
            .then((res) => res[0]);

          if (purchase) {
            const newAmountPaid =
              parseFloat(purchase.amountPaid as any) + item.amountToPay;
            let newPaymentStatus: PaymentStatus = PaymentStatus.Pending;

            if (
              newAmountPaid >=
              parseFloat(purchase.totalAmount as any) - 0.001
            ) {
              newPaymentStatus = PaymentStatus.Paid;
            } else if (newAmountPaid > 0) {
              newPaymentStatus = PaymentStatus.Partial;
            } else {
              newPaymentStatus = PaymentStatus.Pending; // If somehow amountPaid becomes 0
            }

            const [updatedPurchase] = await tx
              .update(purchasesTable)
              .set({
                amountPaid: newAmountPaid,
                paymentStatus: newPaymentStatus,
                updatedAt: new Date(),
              })
              .where(eq(purchasesTable.id, item.purchaseId))
              .returning();
            updatedPurchases.push(updatedPurchase);
          }
        })
      );

      // 8. Create Journal Entries for double-entry accounting
      const journalLines: Array<{
        chartOfAccountId: string;
        debit: number;
        credit: number;
        memo?: string;
      }> = [];

      // Debit 'Accounts Payable' for the amount of purchases being paid
      if (totalPurchasesAmountPaid > 0) {
        journalLines.push({
          chartOfAccountId: accountsPayableCoA,
          debit: totalPurchasesAmountPaid,
          credit: 0,
          memo: `Payment to vendor ${vendor.id} for purchases`,
        });
      }

      // Debit relevant expense accounts for accompanying expenses
      accompanyingExpenseDetails.forEach((exp) => {
        journalLines.push({
          chartOfAccountId: exp.chartOfAccountsId,
          debit: exp.amount,
          credit: 0,
          memo: `Accompanying expense: ${exp.expenseTypeName} for bill payment`,
        });
      });

      // Credit cash/bank accounts for the amounts paid
      payingAccountDetails.forEach((acc) => {
        journalLines.push({
          chartOfAccountId: acc.chartOfAccountsId ?? "",
          debit: 0,
          credit: acc.amountToDeduct,
          memo: `Payment from ${acc.name} for bill ${newBillPayment.billReferenceNo}`,
        });
      });

      if (journalLines.length === 0) {
        throw new Error(
          "No journal entries could be created. This indicates an issue with payment amounts or associated expenses."
        );
      }

      await createJournalEntry({
        tx,
        entryDate: newBillPayment.paymentDate,
        referenceType: JournalEntryReferenceType.BILL_PAYMENT,
        referenceId: newBillPayment.id,
        userId,
        description: `Bill Payment to Vendor ${vendor.id} (Ref: ${newBillPayment.billReferenceNo})`,
        lines: journalLines,
      });

      return {
        billPayment: newBillPayment,
        updatedPurchases: updatedPurchases,
      };
    });

    revalidatePath("/vendors/pay-bills");
    revalidatePath("/accounting-and-finance/bill-tracker");
    // Revalidate individual purchase pages that were affected
    parsedValues.data.purchasesToPay.forEach((item) =>
      revalidatePath(`/purchases/${item.purchaseId}`)
    );
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error processing bill payment:", error);
    throw new Error(error.message || "Failed to process bill payment.");
  }
};

// Get data for Bill Tracker
export const getBillTrackerData = async (
  page: number = 0,
  limit: number = 10,
  filters?: BillTrackerFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      let baseQuery = tx
        .select({
          purchase: purchasesTable,
          vendor: vendorsTable,
          purchaseOrder: purchaseOrdersTable,
          // Aggregate paid amount from billPaymentItemsTable if multiple payments for one purchase
          totalPaidOnPurchase:
            sql<number>`SUM(CASE WHEN ${billPaymentItemsTable.purchaseId} IS NOT NULL THEN ${billPaymentItemsTable.amountApplied} ELSE 0 END)`.as(
              "total_paid_on_purchase"
            ),
          lastPaymentRef:
            sql<string>`MAX(${billPaymentsTable.billReferenceNo})`.as(
              "last_payment_ref"
            ), // Latest reference
        })
        .from(purchasesTable)
        .leftJoin(vendorsTable, eq(purchasesTable.vendorId, vendorsTable.id))
        .leftJoin(
          purchaseOrdersTable,
          eq(purchasesTable.purchaseOrderId, purchaseOrdersTable.id)
        )
        // Left join to billPaymentItemsTable and billPaymentsTable for payment details
        .leftJoin(
          billPaymentItemsTable,
          eq(purchasesTable.id, billPaymentItemsTable.purchaseId)
        )
        .leftJoin(
          billPaymentsTable,
          eq(billPaymentItemsTable.billPaymentId, billPaymentsTable.id)
        )
        .$dynamic();

      const conditions = buildBillTrackerFilterConditions(
        filters ?? ({} as BillTrackerFilters)
      );
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      // Group by purchase to aggregate payment info
      baseQuery = baseQuery.groupBy(
        purchasesTable.id,
        vendorsTable.id,
        purchaseOrdersTable.id
      );

      baseQuery = baseQuery.orderBy(desc(purchasesTable.purchaseDate));

      let totalCount = 0;
      let finalQuery = baseQuery;

      if (
        !limit &&
        !page &&
        !filters?.search &&
        !filters?.vendorId &&
        !filters?.type &&
        !filters?.status &&
        !filters?.dateRange &&
        !filters?.specificDate_start &&
        !filters?.specificDate_end
      ) {
        // If no specific filters/pagination, get all for summary calculations
        // This path needs to execute the grouped query once
        const allPurchases = await baseQuery;
        totalCount = allPurchases.length;
        finalQuery = baseQuery; // Keep the same query
      } else {
        // For pagination and filters, first get count
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(
            tx
              .select({ id: purchasesTable.id })
              .from(purchasesTable)
              .leftJoin(
                vendorsTable,
                eq(purchasesTable.vendorId, vendorsTable.id)
              )
              .leftJoin(
                purchaseOrdersTable,
                eq(purchasesTable.purchaseOrderId, purchaseOrdersTable.id)
              )
              .leftJoin(
                billPaymentItemsTable,
                eq(purchasesTable.id, billPaymentItemsTable.purchaseId)
              )
              .leftJoin(
                billPaymentsTable,
                eq(billPaymentItemsTable.billPaymentId, billPaymentsTable.id)
              )
              .where(and(...conditions))
              .groupBy(purchasesTable.id)
              .as("subquery_count")
          );
        totalCount = countResult?.count || 0;

        finalQuery = baseQuery.limit(limit).offset(page * limit);
      }

      const billRecords = await finalQuery;

      const processedRecords = billRecords.map((record) => {
        const totalAmount = parseFloat(record.purchase.totalAmount as any);
        const amountPaid = parseFloat(
          (record.totalPaidOnPurchase as any) ||
            (record.purchase.amountPaid as any)
        ); // Use aggregated totalPaidOnPurchase if available, else purchase's amountPaid
        const openBalance = totalAmount - amountPaid;
        let paymentStatus = record.purchase.paymentStatus; // Use current status from purchasesTable
        if (openBalance > 0 && amountPaid > 0)
          paymentStatus = PaymentStatus.Partial;
        if (openBalance <= 0.001 && amountPaid > 0)
          paymentStatus = PaymentStatus.Paid; // Account for float
        if (amountPaid <= 0.001 && totalAmount > 0)
          paymentStatus = PaymentStatus.Pending; // Or Due if relevant date has passed

        return {
          ...record,
          purchase: {
            ...record.purchase,
            amountPaid: amountPaid,
            openBalance: openBalance,
            paymentStatus: paymentStatus,
          },
          lastPaymentRef: record.lastPaymentRef,
        };
      });

      return {
        documents: processedRecords,
        total: totalCount,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error: any) {
    console.error("Error fetching Bill Tracker data:", error);
    throw new Error(error.message || "Failed to fetch bill tracker data.");
  }
};

// Get a single Bill Payment by ID
export const getBillPaymentById = async (id: string) => {
  try {
    const billPayment = await db
      .select({
        billPayment: billPaymentsTable,
        vendor: vendorsTable,
        user: usersTable, // User who made the payment
      })
      .from(billPaymentsTable)
      .leftJoin(vendorsTable, eq(billPaymentsTable.vendorId, vendorsTable.id))
      .leftJoin(usersTable, eq(billPaymentsTable.userId, usersTable.id))
      .where(
        and(eq(billPaymentsTable.id, id), eq(billPaymentsTable.isActive, true))
      )
      .then((res) => res[0]);

    if (!billPayment) {
      return null;
    }

    const billPaymentItems = await db
      .select({
        item: billPaymentItemsTable,
        purchase: purchasesTable,
      })
      .from(billPaymentItemsTable)
      .leftJoin(
        purchasesTable,
        eq(billPaymentItemsTable.purchaseId, purchasesTable.id)
      )
      .where(
        and(
          eq(billPaymentItemsTable.billPaymentId, id),
          eq(billPaymentItemsTable.isActive, true)
        )
      );

    const billPaymentAccounts = await db
      .select({
        allocation: billPaymentAccountsTable,
        account: accountsTable,
      })
      .from(billPaymentAccountsTable)
      .leftJoin(
        accountsTable,
        eq(billPaymentAccountsTable.payingAccountId, accountsTable.id)
      )
      .where(
        and(
          eq(billPaymentAccountsTable.billPaymentId, id),
          eq(billPaymentAccountsTable.isActive, true)
        )
      );

    const billPaymentAccompanyingExpenses = await db
      .select({
        expense: billPaymentAccompanyingExpensesTable,
        accompanyingType: accompanyingExpenseTypesTable,
      })
      .from(billPaymentAccompanyingExpensesTable)
      .leftJoin(
        accompanyingExpenseTypesTable,
        eq(
          billPaymentAccompanyingExpensesTable.accompanyingExpenseTypeId,
          accompanyingExpenseTypesTable.id
        )
      )
      .where(
        and(
          eq(billPaymentAccompanyingExpensesTable.billPaymentId, id),
          eq(billPaymentAccompanyingExpensesTable.isActive, true)
        )
      );

    const fullBillPayment = {
      ...billPayment,
      purchasesToPay: billPaymentItems.map((bpi) => ({
        purchaseId: bpi.item.purchaseId,
        amountToPay: parseFloat(bpi.item.amountApplied as any),
        purchaseNumber: bpi.purchase?.purchaseNumber,
        totalAmount: parseFloat(bpi.purchase?.totalAmount as any),
        amountPaidSoFar: parseFloat(bpi.purchase?.amountPaid as any), // This would be before THIS payment
      })),
      payingAccounts: billPaymentAccounts.map((bpa) => ({
        payingAccountId: bpa.allocation.payingAccountId,
        amountPaidFromAccount: parseFloat(
          bpa.allocation.amountPaidFromAccount as any
        ),
        accountName: bpa.account?.name,
        currentBalance: parseFloat(bpa.account?.currentBalance as any),
      })),
      accompanyingExpenses: billPaymentAccompanyingExpenses.map((bpe) => ({
        accompanyingExpenseTypeId: bpe.expense.accompanyingExpenseTypeId,
        amount: parseFloat(bpe.expense.amount as any),
        payee: bpe.expense.payee,
        comments: bpe.expense.comments,
        expenseTypeName: bpe.accompanyingType?.name,
      })),
    };

    return parseStringify(fullBillPayment);
  } catch (error: any) {
    console.error("Error fetching Bill Payment by ID:", error);
    throw new Error(error.message || "Failed to fetch bill payment by ID.");
  }
};

// Update a Bill Payment (Requires careful handling of reversals and re-application)
export const updateBillPayment = async (
  id: string,
  values: Partial<BillPaymentFormValues>,
  userId: string
) => {
  const parsedValues = BillPaymentFormValidation.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Bill Payment data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const currentBillPayment = await tx.query.billPaymentsTable.findFirst({
        where: eq(billPaymentsTable.id, id),
      });
      if (!currentBillPayment) {
        throw new Error("Bill Payment not found.");
      }

      // 1. Validate updated foreign key entities (vendor, paying accounts, accompanying expense types, purchases)
      if (parsedValues.data.vendorId) {
        const [vendor] = await tx
          .select({ id: vendorsTable.id })
          .from(vendorsTable)
          .where(
            and(
              eq(vendorsTable.id, parsedValues.data.vendorId),
              eq(vendorsTable.isActive, true)
            )
          );
        if (!vendor) throw new Error("Vendor not found or is inactive.");
      }
      // Check for unique bill reference number if updated
      if (
        parsedValues.data.billReferenceNo &&
        parsedValues.data.billReferenceNo !== currentBillPayment.billReferenceNo
      ) {
        const existingRef = await tx
          .select({ id: billPaymentsTable.id })
          .from(billPaymentsTable)
          .where(
            and(
              eq(
                billPaymentsTable.billReferenceNo,
                parsedValues.data.billReferenceNo
              ),
              sql`${billPaymentsTable.id} != ${id}`
            )
          );
        if (existingRef.length > 0) {
          throw new Error(
            "Bill payment reference number already exists for another payment."
          );
        }
      }

      // Fetch all current related records to reverse their effects
      const [
        oldBillPaymentItems,
        oldBillPaymentAccounts,
        oldBillPaymentAccompanyingExpenses,
      ] = await Promise.all([
        tx
          .select()
          .from(billPaymentItemsTable)
          .where(eq(billPaymentItemsTable.billPaymentId, id)),
        tx
          .select()
          .from(billPaymentAccountsTable)
          .where(eq(billPaymentAccountsTable.billPaymentId, id)),
        tx
          .select()
          .from(billPaymentAccompanyingExpensesTable)
          .where(eq(billPaymentAccompanyingExpensesTable.billPaymentId, id)),
      ]);

      // --- REVERSAL PHASE ---
      // Fetch accompanying expense details for reversal journal entry
      const accompanyingExpenseDetails = await Promise.all(
        oldBillPaymentAccompanyingExpenses.map(async (exp) => {
          const [accompanyingType] = await tx
            .select({
              id: accompanyingExpenseTypesTable.id,
              defaultExpenseCategoryId:
                accompanyingExpenseTypesTable.defaultExpenseCategoryId,
            })
            .from(accompanyingExpenseTypesTable)
            .where(
              and(
                eq(
                  accompanyingExpenseTypesTable.id,
                  exp.accompanyingExpenseTypeId
                ),
                eq(accompanyingExpenseTypesTable.isActive, true)
              )
            );
          if (!accompanyingType) {
            throw new Error(
              `Accompanying Expense Type '${exp.accompanyingExpenseTypeId}' not found or is inactive.`
            );
          }
          const [expenseCategory] = await tx
            .select({
              chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
            })
            .from(expenseCategoriesTable)
            .where(
              and(
                eq(
                  expenseCategoriesTable.id,
                  accompanyingType.defaultExpenseCategoryId ?? ""
                ),
                eq(expenseCategoriesTable.isActive, true)
              )
            );
          if (!expenseCategory || !expenseCategory.chartOfAccountsId) {
            throw new Error(
              `Default Expense Category for Accompanying Expense Type '${accompanyingType.id}' not found or is inactive.`
            );
          }
          return {
            ...exp,
            chartOfAccountsId: expenseCategory.chartOfAccountsId,
          };
        })
      );

      // Revert changes to paying accounts
      await Promise.all(
        oldBillPaymentAccounts.map(async (bpa) => {
          const [account] = await tx
            .select()
            .from(accountsTable)
            .where(eq(accountsTable.id, bpa.payingAccountId));
          if (account) {
            await tx
              .update(accountsTable)
              .set({
                currentBalance:
                  parseFloat(account.currentBalance as any) +
                  parseFloat(bpa.amountPaidFromAccount as any),
                updatedAt: new Date(),
              })
              .where(eq(accountsTable.id, account.id));
          }
        })
      );

      // Revert changes to purchases (amountPaid, paymentStatus)
      const revertedPurchases: string[] = [];
      await Promise.all(
        oldBillPaymentItems.map(async (bpi) => {
          const [purchase] = await tx
            .select()
            .from(purchasesTable)
            .where(eq(purchasesTable.id, bpi.purchaseId));
          if (purchase) {
            const newAmountPaid =
              parseFloat(purchase.amountPaid as any) -
              parseFloat(bpi.amountApplied as any);
            let newPaymentStatus = PaymentStatus.Pending;
            if (newAmountPaid > 0) newPaymentStatus = PaymentStatus.Partial;
            if (newAmountPaid <= 0.001)
              newPaymentStatus = PaymentStatus.Pending;

            await tx
              .update(purchasesTable)
              .set({
                amountPaid: newAmountPaid,
                paymentStatus: newPaymentStatus,
                updatedAt: new Date(),
              })
              .where(eq(purchasesTable.id, purchase.id));
            revertedPurchases.push(purchase.id);
          }
        })
      );

      // Delete old associated records
      await Promise.all([
        tx
          .delete(billPaymentItemsTable)
          .where(eq(billPaymentItemsTable.billPaymentId, id)),
        tx
          .delete(billPaymentAccountsTable)
          .where(eq(billPaymentAccountsTable.billPaymentId, id)),
        tx
          .delete(billPaymentAccompanyingExpensesTable)
          .where(eq(billPaymentAccompanyingExpensesTable.billPaymentId, id)),
      ]);

      // --- APPLICATION PHASE (with new values) ---
      // Update the main Bill Payment record
      const [updatedBillPayment] = await tx
        .update(billPaymentsTable)
        .set({
          ...parsedValues.data,
          generalComments:
            parsedValues.data.generalComments === null
              ? null
              : parsedValues.data.generalComments ||
                currentBillPayment.generalComments,
          updatedAt: new Date(),
          userId,
        })
        .where(eq(billPaymentsTable.id, id))
        .returning();

      if (!updatedBillPayment) {
        throw new Error("Bill Payment not found or could not be updated.");
      }

      // Re-create Bill Payment Items
      const newBillPaymentItemsData = (
        parsedValues.data.purchasesToPay || []
      ).map((item) => ({
        billPaymentId: updatedBillPayment.id,
        purchaseId: item.purchaseId,
        amountApplied: item.amountToPay,
      }));
      if (newBillPaymentItemsData.length > 0) {
        await tx.insert(billPaymentItemsTable).values(newBillPaymentItemsData);
      }

      // Re-create Bill Payment Accounts
      const newBillPaymentAccountsData = (
        parsedValues.data.payingAccounts || []
      ).map((acc) => ({
        billPaymentId: updatedBillPayment.id,
        payingAccountId: acc.payingAccountId,
        amountPaidFromAccount: acc.amountPaidFromAccount,
      }));
      if (newBillPaymentAccountsData.length > 0) {
        await tx
          .insert(billPaymentAccountsTable)
          .values(newBillPaymentAccountsData);
      }

      // Re-create Bill Payment Accompanying Expenses
      const newBillPaymentAccompanyingExpensesData = (
        parsedValues.data.accompanyingExpenses || []
      ).map((exp) => ({
        billPaymentId: updatedBillPayment.id,
        accompanyingExpenseTypeId: exp.accompanyingExpenseTypeId,
        amount: exp.amount,
        payee: exp.payee,
        comments: exp.comments,
      }));
      if (newBillPaymentAccompanyingExpensesData.length > 0) {
        await tx
          .insert(billPaymentAccompanyingExpensesTable)
          .values(newBillPaymentAccompanyingExpensesData);
      }

      // Deduct from new paying accounts
      const newPayingAccountDetails = await Promise.all(
        (parsedValues.data.payingAccounts || []).map(async (acc) => {
          const [account] = await tx
            .select()
            .from(accountsTable)
            .where(eq(accountsTable.id, acc.payingAccountId));
          return { ...account, amountToDeduct: acc.amountPaidFromAccount };
        })
      );
      await Promise.all(
        newPayingAccountDetails.map(async (acc) =>
          tx
            .update(accountsTable)
            .set({
              currentBalance:
                parseFloat(acc.currentBalance as any) - acc.amountToDeduct,
              updatedAt: new Date(),
            })
            .where(eq(accountsTable.id, acc.id))
        )
      );

      // Update purchase statuses with new amounts
      const newlyUpdatedPurchases: (typeof purchasesTable.$inferSelect)[] = [];
      await Promise.all(
        (parsedValues.data.purchasesToPay || []).map(async (item) => {
          const purchase = await tx
            .select()
            .from(purchasesTable)
            .where(eq(purchasesTable.id, item.purchaseId))
            .then((res) => res[0]);

          if (purchase) {
            const newAmountPaid =
              parseFloat(purchase.amountPaid as any) + item.amountToPay;
            let newPaymentStatus: PaymentStatus = PaymentStatus.Pending;
            if (
              newAmountPaid >=
              parseFloat(purchase.totalAmount as any) - 0.001
            ) {
              newPaymentStatus = PaymentStatus.Paid;
            } else if (newAmountPaid > 0) {
              newPaymentStatus = PaymentStatus.Partial;
            } else {
              newPaymentStatus = PaymentStatus.Pending;
            }
            const [updatedPurchase] = await tx
              .update(purchasesTable)
              .set({
                amountPaid: newAmountPaid,
                paymentStatus: newPaymentStatus,
                updatedAt: new Date(),
              })
              .where(eq(purchasesTable.id, item.purchaseId))
              .returning();
            newlyUpdatedPurchases.push(updatedPurchase);
          }
        })
      );

      // Create an adjustment journal entry
      const journalLines: Array<{
        chartOfAccountId: string;
        debit: number;
        credit: number;
        memo?: string;
      }> = [];
      const accountsPayableCoA =
        (await tx
          .select({ id: chartOfAccountsTable.id })
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(chartOfAccountsTable.accountName, "Accounts Payable"),
              eq(chartOfAccountsTable.accountType, "liability")
            )
          )
          .then((res) => res[0]?.id)) ||
        throwError("Default 'Accounts Payable' Chart of Account not found.");

      // Reversal lines (old values)
      if (oldBillPaymentItems.length > 0) {
        const oldTotalPurchasesPaid = oldBillPaymentItems.reduce(
          (sum, bpi) => sum + parseFloat(bpi.amountApplied as any),
          0
        );
        journalLines.push({
          chartOfAccountId: accountsPayableCoA, // Credit Accounts Payable (reverse original debit)
          debit: 0,
          credit: oldTotalPurchasesPaid,
          memo: `Reversal: reduce Accounts Payable for old payment on bill ${currentBillPayment.billReferenceNo}`,
        });
      }

      oldBillPaymentAccompanyingExpenses.forEach((exp) => {
        const coaId = accompanyingExpenseDetails.find(
          (d) => d.accompanyingExpenseTypeId === exp.accompanyingExpenseTypeId
        )?.chartOfAccountsId;
        if (coaId) {
          journalLines.push({
            chartOfAccountId: coaId, // Credit expense account (reverse original debit)
            debit: 0,
            credit: parseFloat(exp.amount as any),
            memo: `Reversal: reduce accompanying expense for bill payment`,
          });
        }
      });
      oldBillPaymentAccounts.forEach((acc) => {
        const coaId = newPayingAccountDetails.find(
          (d) => d.id === acc.payingAccountId
        )?.chartOfAccountsId;
        if (coaId) {
          journalLines.push({
            chartOfAccountId: coaId, // Debit cash/bank account (reverse original credit - restore funds)
            debit: parseFloat(acc.amountPaidFromAccount as any),
            credit: 0,
            memo: `Reversal: restore funds to ${coaId}`,
          });
        }
      });

      // New lines (updated values)
      const newTotalPurchasesPaid = (
        parsedValues.data.purchasesToPay || []
      ).reduce((sum, item) => sum + item.amountToPay, 0);
      if (newTotalPurchasesPaid > 0) {
        journalLines.push({
          chartOfAccountId: accountsPayableCoA, // Debit Accounts Payable
          debit: newTotalPurchasesPaid,
          credit: 0,
          memo: `New: payment to vendor for purchases on bill ${updatedBillPayment.billReferenceNo}`,
        });
      }
      (parsedValues.data.accompanyingExpenses || []).forEach((exp) => {
        const coaId = accompanyingExpenseDetails.find(
          (d) => d.accompanyingExpenseTypeId === exp.accompanyingExpenseTypeId
        )?.chartOfAccountsId;
        if (coaId) {
          journalLines.push({
            chartOfAccountId: coaId, // Debit relevant expense accounts
            debit: exp.amount,
            credit: 0,
            memo: `New: accompanying expense for bill payment`,
          });
        }
      });
      (parsedValues.data.payingAccounts || []).forEach((acc) => {
        const coaId = newPayingAccountDetails.find(
          (d) => d.id === acc.payingAccountId
        )?.chartOfAccountsId;
        if (coaId) {
          journalLines.push({
            chartOfAccountId: coaId, // Credit cash/bank accounts
            debit: 0,
            credit: acc.amountPaidFromAccount,
            memo: `New: payment from ${coaId} for bill ${updatedBillPayment.billReferenceNo}`,
          });
        }
      });

      await createJournalEntry({
        tx,
        entryDate: new Date(),
        referenceType: JournalEntryReferenceType.ADJUSTMENT,
        referenceId: updatedBillPayment.id,
        userId,
        description: `Adjustment for Bill Payment: ${updatedBillPayment.billReferenceNo} (ID: ${updatedBillPayment.id})`,
        lines: journalLines,
      });

      return {
        billPayment: updatedBillPayment,
        updatedPurchases: newlyUpdatedPurchases,
      };
    });

    revalidatePath("/vendors/pay-bills");
    revalidatePath("/accounting-and-finance/bill-tracker");
    revalidatePath(`/vendors/pay-bills/${id}`);
    revalidatePath(`/purchases/`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating Bill Payment:", error);
    throw new Error(error.message || "Failed to update bill payment.");
  }
};

// Soft delete a Bill Payment
export const softDeleteBillPayment = async (id: string, userId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentBillPayment = await tx
        .select({
          id: billPaymentsTable.id,
          totalPaymentAmount: billPaymentsTable.totalPaymentAmount,
          billReferenceNo: billPaymentsTable.billReferenceNo,
          paymentDate: billPaymentsTable.paymentDate,
          vendorId: billPaymentsTable.vendorId,
        })
        .from(billPaymentsTable)
        .where(eq(billPaymentsTable.id, id))
        .then((res) => res[0]);

      if (!currentBillPayment) {
        throw new Error("Bill Payment not found.");
      }

      // Fetch all related records to revert their effects
      const [
        billPaymentItems,
        billPaymentAccounts,
        billPaymentAccompanyingExpenses,
      ] = await Promise.all([
        tx
          .select()
          .from(billPaymentItemsTable)
          .where(eq(billPaymentItemsTable.billPaymentId, id)),
        tx
          .select()
          .from(billPaymentAccountsTable)
          .where(eq(billPaymentAccountsTable.billPaymentId, id)),
        tx
          .select()
          .from(billPaymentAccompanyingExpensesTable)
          .where(eq(billPaymentAccompanyingExpensesTable.billPaymentId, id)),
      ]);

      // Revert changes to paying accounts
      await Promise.all(
        billPaymentAccounts.map(async (bpa) => {
          const [account] = await tx
            .select()
            .from(accountsTable)
            .where(eq(accountsTable.id, bpa.payingAccountId));
          if (account) {
            await tx
              .update(accountsTable)
              .set({
                currentBalance:
                  parseFloat(account.currentBalance as any) +
                  parseFloat(bpa.amountPaidFromAccount as any),
                updatedAt: new Date(),
              })
              .where(eq(accountsTable.id, account.id));
          }
        })
      );

      // Revert changes to purchases (amountPaid, paymentStatus)
      const revertedPurchases: string[] = [];
      await Promise.all(
        billPaymentItems.map(async (bpi) => {
          const [purchase] = await tx
            .select()
            .from(purchasesTable)
            .where(eq(purchasesTable.id, bpi.purchaseId));
          if (purchase) {
            const newAmountPaid =
              parseFloat(purchase.amountPaid as any) -
              parseFloat(bpi.amountApplied as any);
            let newPaymentStatus = PaymentStatus.Pending;
            if (newAmountPaid > 0) newPaymentStatus = PaymentStatus.Partial;
            if (newAmountPaid <= 0.001)
              newPaymentStatus = PaymentStatus.Pending;

            await tx
              .update(purchasesTable)
              .set({
                amountPaid: newAmountPaid,
                paymentStatus: newPaymentStatus,
                updatedAt: new Date(),
              })
              .where(eq(purchasesTable.id, purchase.id));
            revertedPurchases.push(purchase.id);
          }
        })
      );

      // Soft delete associated records
      await Promise.all([
        tx
          .update(billPaymentItemsTable)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(billPaymentItemsTable.billPaymentId, id)),
        tx
          .update(billPaymentAccountsTable)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(billPaymentAccountsTable.billPaymentId, id)),
        tx
          .update(billPaymentAccompanyingExpensesTable)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(billPaymentAccompanyingExpensesTable.billPaymentId, id)),
      ]);

      // Soft delete the main Bill Payment record
      const [updatedBillPayment] = await tx
        .update(billPaymentsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(billPaymentsTable.id, id))
        .returning();

      // Create a reversal journal entry
      const journalLines: Array<{
        chartOfAccountId: string;
        debit: number;
        credit: number;
        memo?: string;
      }> = [];
      const accountsPayableCoA =
        (await tx
          .select({ id: chartOfAccountsTable.id })
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(chartOfAccountsTable.accountName, "Accounts Payable"),
              eq(chartOfAccountsTable.accountType, "liability")
            )
          )
          .then((res) => res[0]?.id)) ||
        throwError("Default 'Accounts Payable' Chart of Account not found.");

      // Reversal lines
      if (billPaymentItems.length > 0) {
        const totalPurchasesPaid = billPaymentItems.reduce(
          (sum, bpi) => sum + parseFloat(bpi.amountApplied as any),
          0
        );
        journalLines.push({
          chartOfAccountId: accountsPayableCoA, // Credit Accounts Payable (reverse debit)
          debit: 0,
          credit: totalPurchasesPaid,
          memo: `Reversal: reduce Accounts Payable for bill ${currentBillPayment.billReferenceNo}`,
        });
      }
      for (const exp of billPaymentAccompanyingExpenses) {
        const coaId =
          (await tx
            .select({
              chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
            })
            .from(expenseCategoriesTable)
            .leftJoin(
              accompanyingExpenseTypesTable,
              eq(
                expenseCategoriesTable.id,
                accompanyingExpenseTypesTable.defaultExpenseCategoryId
              )
            )
            .where(
              eq(
                accompanyingExpenseTypesTable.id,
                exp.accompanyingExpenseTypeId
              )
            )
            .then((res) => res[0]?.chartOfAccountsId)) ||
          throwError("Accompanying Expense Type CoA not found for reversal.");
        journalLines.push({
          chartOfAccountId: coaId, // Credit expense account (reverse debit)
          debit: 0,
          credit: parseFloat(exp.amount as any),
          memo: `Reversal: reduce accompanying expense for bill payment`,
        });
      }
      for (const acc of billPaymentAccounts) {
        const coaId =
          (await tx
            .select({ chartOfAccountsId: accountsTable.chartOfAccountsId })
            .from(accountsTable)
            .where(eq(accountsTable.id, acc.payingAccountId))
            .then((res) => res[0]?.chartOfAccountsId)) ||
          throwError("Paying Account CoA not found for reversal.");
        journalLines.push({
          chartOfAccountId: coaId, // Debit cash/bank account (restore funds)
          debit: parseFloat(acc.amountPaidFromAccount as any),
          credit: 0,
          memo: `Reversal: restore funds to ${coaId}`,
        });
      }

      await createJournalEntry({
        tx,
        entryDate: new Date(), // Use current date for reversal entry
        referenceType: JournalEntryReferenceType.ADJUSTMENT,
        referenceId: updatedBillPayment.id,
        userId,
        description: `Reversal of Bill Payment: ${updatedBillPayment.billReferenceNo} (ID: ${updatedBillPayment.id})`,
        lines: journalLines,
      });

      return updatedBillPayment;
    });

    revalidatePath("/vendors/pay-bills");
    revalidatePath("/accounting-and-finance/bill-tracker");
    revalidatePath(`/purchases`);

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting Bill Payment:", error);
    throw new Error(error.message || "Failed to deactivate bill payment.");
  }
};

function throwError(message: string): never {
  throw new Error(message);
}
