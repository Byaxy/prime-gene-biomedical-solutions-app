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

  if (filters.type && filters.type !== "all") {
    if (filters.type === "purchase_orders") {
      conditions.push(sql`${purchasesTable.purchaseOrderId} IS NOT NULL`);
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

  if (filters.status && filters.status !== "all") {
    conditions.push(
      eq(purchasesTable.paymentStatus, filters.status as PaymentStatus)
    );
  }

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
        .select({ id: vendorsTable.id, name: vendorsTable.name })
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
          and(
            eq(
              billPaymentsTable.billReferenceNo,
              parsedValues.data.billReferenceNo
            ),
            eq(billPaymentsTable.isActive, true)
          )
        );
      if (existingPaymentWithRef.length > 0) {
        throw new Error(
          `Bill payment reference number '${parsedValues.data.billReferenceNo}' already exists.`
        );
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
              `Paying Account '${acc.accountName}' not found or is inactive.`
            );
          }
          if (
            parseFloat(account.currentBalance as any) <
            acc.amountPaidFromAccount
          ) {
            throw new Error(
              `Insufficient funds in account '${
                account.name
              }'. Available: ${parseFloat(
                account.currentBalance as any
              ).toFixed(2)}, Required: ${acc.amountPaidFromAccount.toFixed(2)}.`
            );
          }
          return { ...account, amountToDeduct: acc.amountPaidFromAccount };
        })
      );

      // Validate purchases to pay and calculate total purchases amount paid
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
              `Purchase '${item.purchaseNumber}' not found or is inactive.`
            );
          }
          const outstandingAmount =
            parseFloat(purchase.totalAmount as any) -
            parseFloat(purchase.amountPaid as any);
          if (item.amountToPay > outstandingAmount + 0.001) {
            // Epsilon for floating point
            throw new Error(
              `Amount to pay (${item.amountToPay.toFixed(2)}) for purchase '${
                purchase.id
              }' exceeds outstanding amount (${outstandingAmount.toFixed(2)}).`
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
              name: accompanyingExpenseTypesTable.name,
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
              `Accompanying Expense Type '${exp.expenseTypeName}' not found or is inactive.`
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
              `Default Expense Category for Accompanying Expense Type '${accompanyingType.name}' not found or is inactive or not linked to a CoA.`
            );
          }
          // Include expenseTypeName for journal entry memo for clarity
          return {
            ...exp,
            chartOfAccountsId: expenseCategory.chartOfAccountsId,
            expenseTypeName: accompanyingType.name,
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
          totalPaymentAmount: parsedValues.data.totalPaymentAmount,
          generalComments: parsedValues.data.generalComments || null,
          attachments: parsedValues.data.attachments,
          userId,
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
            payee: exp.payee || null,
            comments: exp.comments || null,
          }));
        await tx
          .insert(billPaymentAccompanyingExpensesTable)
          .values(billPaymentAccompanyingExpensesData);
      }

      // 6. Update accountsTable.currentBalance for all involved payingAccountIds
      await Promise.all(
        payingAccountDetails.map(async (acc) =>
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

      // Debit 'Accounts Payable' for the total amount of purchases being paid
      if (totalPurchasesAmountPaid > 0) {
        journalLines.push({
          chartOfAccountId: accountsPayableCoA,
          debit: totalPurchasesAmountPaid,
          credit: 0,
          memo: `Payment to vendor ${vendor.name} for purchases`,
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
          chartOfAccountId: acc.chartOfAccountsId ?? "", // Ensure CoA ID is not null
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
        userId, // userId passed to createJournalEntry
        description: `Bill Payment to Vendor ${vendor.name} (Ref: ${newBillPayment.billReferenceNo})`,
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
  // Removed getAllBills as it's handled by limit/page = 0
  try {
    const result = await db.transaction(async (tx) => {
      // Base query for filtering and aggregation.
      let baseQuery = tx
        .select({
          purchase: purchasesTable,
          vendor: vendorsTable,
          // Aggregate total amount paid towards this specific purchase
          totalPaidOnPurchase:
            sql<number>`COALESCE(SUM(${billPaymentItemsTable.amountApplied}), 0)`.as(
              // COALESCE for 0 if no matching items
              "total_paid_on_purchase"
            ),
          // Get the ID and reference number of the LATEST bill payment for this purchase
          // This requires a lateral join or correlated subquery for robust "latest" logic.
          // Using a correlated subquery for now.
          latestBillPaymentInfo: sql<{
            id: string | null;
            ref: string | null;
          }>`(
              SELECT json_build_object(
                  'id', bp.id,
                  'ref', bp.bill_reference_no
              )
              FROM ${billPaymentsTable} bp
              JOIN ${billPaymentItemsTable} bpi_latest ON bp.id = bpi_latest.bill_payment_id
              WHERE bpi_latest.purchase_id = ${purchasesTable.id}
              AND bp.is_active = TRUE -- Only consider active bill payments
              ORDER BY bp.created_at DESC
              LIMIT 1
          )`.as("latest_bill_payment_info"),
        })
        .from(purchasesTable)
        .leftJoin(vendorsTable, eq(purchasesTable.vendorId, vendorsTable.id))

        // LEFT JOIN billPaymentItemsTable to sum up all payments for this purchase
        // Grouping is needed because SUM is an aggregate function.
        .leftJoin(
          billPaymentItemsTable,
          eq(purchasesTable.id, billPaymentItemsTable.purchaseId)
        )
        .$dynamic();

      const conditions = buildBillTrackerFilterConditions(
        filters ?? ({} as BillTrackerFilters)
      );
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      // Group by purchase and related foreign keys to ensure correct aggregation
      // and to allow selection of non-aggregated columns.
      baseQuery = baseQuery.groupBy(purchasesTable.id, vendorsTable.id);

      baseQuery = baseQuery.orderBy(desc(purchasesTable.purchaseDate));

      // 1. Get total count of *distinct purchases* matching filters (before pagination)
      const countQuery = tx
        .select({
          count: sql<number>`count(DISTINCT ${purchasesTable.id})`.as("count"),
        })
        .from(purchasesTable)
        .leftJoin(vendorsTable, eq(purchasesTable.vendorId, vendorsTable.id))

        // Need to include relevant joins for filters to apply correctly to the count
        .leftJoin(
          billPaymentItemsTable, // join for filter context
          eq(purchasesTable.id, billPaymentItemsTable.purchaseId)
        )
        .where(and(...conditions))
        .$dynamic();

      const [totalCountResult] = await countQuery;
      const totalCount = totalCountResult?.count || 0;

      // 2. Apply pagination (limit and offset) to the main query for fetching documents
      const paginatedQuery = baseQuery.limit(limit).offset(page * limit);
      const billRecords = await paginatedQuery;

      const processedRecords = billRecords.map((record) => {
        const totalAmount = parseFloat(record.purchase.totalAmount as any);
        const amountPaidAggregated = parseFloat(
          (record.totalPaidOnPurchase as any) || "0"
        ); // Aggregated sum
        const openBalance = totalAmount - amountPaidAggregated;
        // Start with the purchase's stored status, mapping the possible string values to the PaymentStatus enum
        let paymentStatus: PaymentStatus = (() => {
          const ps = record.purchase.paymentStatus as unknown as
            | string
            | undefined;
          if (!ps) return PaymentStatus.Pending;
          const map: Record<string, PaymentStatus> = {
            paid: PaymentStatus.Paid,
            partial: PaymentStatus.Partial,
            pending: PaymentStatus.Pending,
            due: PaymentStatus.Due,
          };
          return map[ps.toLowerCase()] ?? PaymentStatus.Pending;
        })();

        // Refine payment status based on calculated paid amount
        if (totalAmount <= 0.001) {
          // If total amount is effectively zero, it's considered paid/no balance
          paymentStatus = PaymentStatus.Paid;
        } else if (openBalance <= 0.001) {
          // If balance is zero or negligible
          paymentStatus = PaymentStatus.Paid;
        } else if (amountPaidAggregated > 0) {
          paymentStatus = PaymentStatus.Partial;
        } else {
          // No amount paid yet, and something is due
          paymentStatus = PaymentStatus.Pending; // Or 'Due' if you add specific due date logic
        }

        const latestPaymentInfo = record.latestBillPaymentInfo as {
          id: string | null;
          ref: string | null;
        } | null;

        return {
          ...record,
          billPaymentId: latestPaymentInfo?.id || null, // CORRECTED: Actual BillPayment ID
          purchase: {
            ...record.purchase,
            amountPaid: amountPaidAggregated.toFixed(2), // Override with calculated paid amount, fixed 2 decimal
          },
          openBalance: openBalance.toFixed(2), // Client-side calculated for display, fixed 2 decimal
          paymentStatus: paymentStatus, // Client-side derived for display
          lastPaymentRef: latestPaymentInfo?.ref || null, // Latest payment reference number
        };
      });

      return {
        documents: parseStringify(processedRecords),
        total: totalCount,
      };
    });

    return parseStringify(result);
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
        user: usersTable,
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

    // Fetch related line items (purchasesToPay)
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

    // Fetch related payment accounts
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

    // Fetch related accompanying expenses
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

    // Construct the full BillPaymentWithRelations object
    const fullBillPayment = {
      billPayment: {
        ...billPayment.billPayment,
        totalPaymentAmount: parseFloat(
          billPayment.billPayment.totalPaymentAmount as any
        ),
      },
      vendor: billPayment.vendor,
      user: billPayment.user,
      items: billPaymentItems.map((bpi) => ({
        item: {
          ...bpi.item,
          amountApplied: parseFloat(bpi.item.amountApplied as any),
        },
        purchase: bpi.purchase
          ? {
              ...bpi.purchase,
              totalAmount: parseFloat(bpi.purchase.totalAmount as any),
              amountPaid: parseFloat(bpi.purchase.amountPaid as any),
            }
          : null,
      })),
      payingAccounts: billPaymentAccounts.map((bpa) => ({
        allocation: {
          ...bpa.allocation,
          amountPaidFromAccount: parseFloat(
            bpa.allocation.amountPaidFromAccount as any
          ),
        },
        account: bpa.account
          ? {
              ...bpa.account,
              currentBalance: parseFloat(bpa.account.currentBalance as any),
              openingBalance: parseFloat(bpa.account.openingBalance as any),
            }
          : null,
      })),
      accompanyingExpenses: billPaymentAccompanyingExpenses.map((bpe) => ({
        expense: {
          ...bpe.expense,
          amount: parseFloat(bpe.expense.amount as any),
        },
        accompanyingType: bpe.accompanyingType,
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
          .select({ id: vendorsTable.id, name: vendorsTable.name })
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
              eq(billPaymentsTable.isActive, true), // Check against active payments
              sql`${billPaymentsTable.id} != ${id}`
            )
          );
        if (existingRef.length > 0) {
          throw new Error(
            `Bill payment reference number '${parsedValues.data.billReferenceNo}' already exists for another active payment.`
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
      const oldAccompanyingExpenseDetailsWithCoA = await Promise.all(
        oldBillPaymentAccompanyingExpenses.map(async (exp) => {
          const [accompanyingType] = await tx
            .select({
              id: accompanyingExpenseTypesTable.id,
              name: accompanyingExpenseTypesTable.name, // Fetch name for memo
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
              `Original Accompanying Expense Type not found or is inactive.`
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
              `Default Expense Category for Original Accompanying Expense Type '${accompanyingType.name}' not found or is inactive or not linked to a CoA.`
            );
          }
          return {
            ...exp,
            chartOfAccountsId: expenseCategory.chartOfAccountsId,
            expenseTypeName: accompanyingType.name,
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
          const purchase = await tx
            .select()
            .from(purchasesTable)
            .where(eq(purchasesTable.id, bpi.purchaseId))
            .then((res) => res[0]);
          if (purchase) {
            const newAmountPaid =
              parseFloat(purchase.amountPaid as any) -
              parseFloat(bpi.amountApplied as any);
            let newPaymentStatus = PaymentStatus.Pending;
            if (newAmountPaid > 0) newPaymentStatus = PaymentStatus.Partial;
            if (
              newAmountPaid <= 0.001 &&
              parseFloat(purchase.totalAmount as any) > 0
            )
              newPaymentStatus = PaymentStatus.Pending; // If purchase has total > 0 but paid is now ~0
            if (parseFloat(purchase.totalAmount as any) <= 0.001)
              // If purchase total was 0, it's paid
              newPaymentStatus = PaymentStatus.Paid;

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
      // 1. Validate new accompanying expenses and collect CoA IDs
      const newAccompanyingExpenseDetailsWithCoA = await Promise.all(
        (parsedValues.data.accompanyingExpenses || []).map(async (exp) => {
          const [accompanyingType] = await tx
            .select({
              id: accompanyingExpenseTypesTable.id,
              name: accompanyingExpenseTypesTable.name, // Fetch name for memo
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
              `Accompanying Expense Type '${exp.expenseTypeName}' not found or is inactive.`
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
              `Default Expense Category for Accompanying Expense Type '${accompanyingType.id}' not found or is inactive or not linked to a CoA.`
            );
          }
          return {
            ...exp,
            chartOfAccountsId: expenseCategory.chartOfAccountsId,
            expenseTypeName: accompanyingType.name,
          };
        })
      );

      // 2. Update the main Bill Payment record
      const [updatedBillPayment] = await tx
        .update(billPaymentsTable)
        .set({
          billReferenceNo: parsedValues.data.billReferenceNo,
          paymentDate: parsedValues.data.paymentDate,
          vendorId: parsedValues.data.vendorId,
          totalPaymentAmount: parsedValues.data.totalPaymentAmount,
          generalComments: parsedValues.data.generalComments || null,
          attachments: parsedValues.data.attachments,
          updatedAt: new Date(),
          userId, // userId for updated_by tracking
        })
        .where(eq(billPaymentsTable.id, id))
        .returning();

      if (!updatedBillPayment) {
        throw new Error("Bill Payment not found or could not be updated.");
      }

      // 3. Re-create Bill Payment Items
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

      // 4. Re-create Bill Payment Accounts
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

      // 5. Re-create Bill Payment Accompanying Expenses
      const newBillPaymentAccompanyingExpensesData = (
        newAccompanyingExpenseDetailsWithCoA || []
      ).map((exp) => ({
        billPaymentId: updatedBillPayment.id,
        accompanyingExpenseTypeId: exp.accompanyingExpenseTypeId,
        amount: exp.amount,
        payee: exp.payee || null,
        comments: exp.comments || null,
      }));
      if (newBillPaymentAccompanyingExpensesData.length > 0) {
        await tx
          .insert(billPaymentAccompanyingExpensesTable)
          .values(newBillPaymentAccompanyingExpensesData);
      }

      // 6. Deduct from new paying accounts
      const newPayingAccountDetails = await Promise.all(
        (parsedValues.data.payingAccounts || []).map(async (acc) => {
          const [account] = await tx
            .select({
              id: accountsTable.id,
              chartOfAccountsId: accountsTable.chartOfAccountsId,
              currentBalance: accountsTable.currentBalance,
              name: accountsTable.name,
            })
            .from(accountsTable)
            .where(eq(accountsTable.id, acc.payingAccountId));
          if (!account) {
            // Defensive check
            throw new Error(
              `Paying Account '${acc.accountName}' not found for deduction.`
            );
          }
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

      // 7. Update purchase statuses with new amounts
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

      // 8. Create an adjustment journal entry
      const journalLines: Array<{
        chartOfAccountId: string;
        debit: number;
        credit: number;
        memo?: string;
      }> = [];
      // CORRECTED: Accounts Payable CoA Lookup by accountNumber
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
        throwError(
          "Default 'Accounts Payable' Chart of Account (2000) not found."
        );

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

      oldAccompanyingExpenseDetailsWithCoA.forEach((exp) => {
        journalLines.push({
          chartOfAccountId: exp.chartOfAccountsId,
          debit: 0,
          credit: parseFloat(exp.amount as any),
          memo: `Reversal: reduce accompanying expense '${exp.expenseTypeName}' for bill payment`, // Use expenseTypeName
        });
      });
      // Need CoA ID of old paying accounts for reversal
      const oldPayingAccountDetailsWithCoA = await Promise.all(
        oldBillPaymentAccounts.map(async (acc) => {
          const [account] = await tx
            .select({
              id: accountsTable.id,
              name: accountsTable.name,
              chartOfAccountsId: accountsTable.chartOfAccountsId,
            })
            .from(accountsTable)
            .where(eq(accountsTable.id, acc.payingAccountId));
          if (!account)
            throw new Error(
              `Original paying account '${acc.payingAccountId}' not found for CoA lookup.`
            );
          return {
            ...acc,
            chartOfAccountsId: account.chartOfAccountsId,
            name: account.name,
          };
        })
      );

      oldPayingAccountDetailsWithCoA.forEach((acc) => {
        journalLines.push({
          chartOfAccountId: acc.chartOfAccountsId ?? "",
          debit: parseFloat(acc.amountPaidFromAccount as any),
          credit: 0,
          memo: `Reversal: restore funds to ${acc.name} for bill payment`,
        });
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
      newAccompanyingExpenseDetailsWithCoA.forEach((exp) => {
        // Use the newly validated expenses
        journalLines.push({
          chartOfAccountId: exp.chartOfAccountsId,
          debit: exp.amount,
          credit: 0,
          memo: `New: accompanying expense '${exp.expenseTypeName}' for bill payment`, // Use expenseTypeName
        });
      });
      newPayingAccountDetails.forEach((acc) => {
        // Use the newly fetched/validated paying account details
        journalLines.push({
          chartOfAccountId: acc.chartOfAccountsId ?? "",
          debit: 0,
          credit: acc.amountToDeduct,
          memo: `New: payment from ${acc.name} for bill ${updatedBillPayment.billReferenceNo}`,
        });
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
            if (
              newAmountPaid <= 0.001 &&
              parseFloat(purchase.totalAmount as any) > 0
            )
              // If paid 0 and total > 0, it's pending
              newPaymentStatus = PaymentStatus.Pending;
            if (parseFloat(purchase.totalAmount as any) <= 0.001)
              // If purchase total was 0, it's paid
              newPaymentStatus = PaymentStatus.Paid;

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
      // CORRECTED: Accounts Payable CoA Lookup by accountNumber
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

      // Fetch Accompanying Expense details for reversal
      const oldAccompanyingExpenseDetailsWithCoA = await Promise.all(
        billPaymentAccompanyingExpenses.map(async (exp) => {
          const [accompanyingType] = await tx
            .select({
              id: accompanyingExpenseTypesTable.id,
              name: accompanyingExpenseTypesTable.name,
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
            expenseTypeName: accompanyingType.name,
          };
        })
      );

      oldAccompanyingExpenseDetailsWithCoA.forEach((exp) => {
        journalLines.push({
          chartOfAccountId: exp.chartOfAccountsId, // Credit expense account (reverse debit)
          debit: 0,
          credit: parseFloat(exp.amount as any),
          memo: `Reversal: reduce accompanying expense '${exp.expenseTypeName}' for bill payment`,
        });
      });

      // Fetch Paying Account details for reversal
      const oldPayingAccountDetailsWithCoA = await Promise.all(
        billPaymentAccounts.map(async (acc) => {
          const [account] = await tx
            .select({
              id: accountsTable.id,
              name: accountsTable.name,
              chartOfAccountsId: accountsTable.chartOfAccountsId,
            })
            .from(accountsTable)
            .where(eq(accountsTable.id, acc.payingAccountId));
          if (!account)
            throw new Error(
              `Original paying account '${acc.payingAccountId}' not found for CoA lookup.`
            );
          return {
            ...acc,
            chartOfAccountsId: account.chartOfAccountsId,
            name: account.name,
          };
        })
      );

      oldPayingAccountDetailsWithCoA.forEach((acc) => {
        journalLines.push({
          chartOfAccountId: acc.chartOfAccountsId ?? "", // Debit cash/bank account (restore funds)
          debit: parseFloat(acc.amountPaidFromAccount as any),
          credit: 0,
          memo: `Reversal: restore funds to ${acc.name} for bill payment`,
        });
      });

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

// Generate reference number
export const generateBillReferenceNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastPaymnet = await tx
        .select({ billReferenceNo: billPaymentsTable.billReferenceNo })
        .from(billPaymentsTable)
        .where(sql`bill_reference_no LIKE ${`BRN.${year}/${month}/%`}`)
        .orderBy(desc(billPaymentsTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastPaymnet.length > 0) {
        const lastReferenceNumber = lastPaymnet[0].billReferenceNo;
        const lastSequence = parseInt(
          lastReferenceNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `BRN.${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating payment reference number:", error);
    throw error;
  }
};
