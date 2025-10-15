/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { ExpenseFormValues } from "../validation";
import { db } from "@/drizzle/db";
import {
  accompanyingExpenseTypesTable,
  accountsTable,
  expenseCategoriesTable,
  expensesTable,
  purchasesTable,
} from "@/drizzle/schema";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { JournalEntryReferenceType } from "@/types";
import { createJournalEntry } from "./accounting.actions";

const buildExpenseFilterConditions = (filters: any) => {
  const conditions = [];

  conditions.push(eq(expensesTable.isActive, true));

  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(expensesTable.title, searchTerm),
        ilike(expensesTable.description, searchTerm),
        ilike(expensesTable.referenceNumber, searchTerm),
        ilike(expensesTable.payee, searchTerm),
        ilike(expenseCategoriesTable.name, searchTerm),
        ilike(accountsTable.name, searchTerm)
      )
    );
  }

  if (filters.expenseCategoryId) {
    conditions.push(
      eq(expensesTable.expenseCategoryId, filters.expenseCategoryId)
    );
  }
  if (filters.payingAccountId) {
    conditions.push(eq(expensesTable.payingAccountId, filters.payingAccountId));
  }
  if (filters.payee) {
    conditions.push(ilike(expensesTable.payee, `%${filters.payee.trim()}%`));
  }
  if (filters.purchaseId) {
    // For accompanying expenses
    conditions.push(eq(expensesTable.purchaseId, filters.purchaseId));
  }
  if (filters.accompanyingExpenseTypeId) {
    // For accompanying expenses
    conditions.push(
      eq(
        expensesTable.accompanyingExpenseTypeId,
        filters.accompanyingExpenseTypeId
      )
    );
  }

  // Date range filters
  if (filters.expenseDate_start) {
    conditions.push(
      gte(expensesTable.expenseDate, new Date(filters.expenseDate_start))
    );
  }
  if (filters.expenseDate_end) {
    conditions.push(
      lte(expensesTable.expenseDate, new Date(filters.expenseDate_end))
    );
  }

  return conditions;
};

// Add expense
export const addExpense = async (values: ExpenseFormValues, userId: string) => {
  try {
    const result = db.transaction(async (tx) => {
      // 1. Validate existence and status of foreign key entities
      const [expenseCategory] = await tx
        .select({
          id: expenseCategoriesTable.id,
          chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
        })
        .from(expenseCategoriesTable)
        .where(
          and(
            eq(expenseCategoriesTable.id, values.expenseCategoryId),
            eq(expenseCategoriesTable.isActive, true)
          )
        );

      if (!expenseCategory) {
        throw new Error("Expense Category not found or is inactive.");
      }

      const [payingAccount] = await tx
        .select({
          id: accountsTable.id,
          chartOfAccountsId: accountsTable.chartOfAccountsId,
          currentBalance: accountsTable.currentBalance,
          name: accountsTable.name,
        })
        .from(accountsTable)
        .where(
          and(
            eq(accountsTable.id, values.payingAccountId),
            eq(accountsTable.isActive, true)
          )
        );

      if (!payingAccount) {
        throw new Error("Paying Account not found or is inactive.");
      }
      if (parseFloat(payingAccount.currentBalance as any) < values.amount) {
        throw new Error("Insufficient funds in the selected paying account.");
      }

      // Check if reference number is unique
      const existingExpenseWithRef = await tx
        .select({ id: expensesTable.id })
        .from(expensesTable)
        .where(eq(expensesTable.referenceNumber, values.referenceNumber));
      if (existingExpenseWithRef.length > 0) {
        throw new Error("Expense reference number already exists.");
      }

      // If it's an accompanying expense, validate purchaseId and accompanyingExpenseTypeId
      if (values.isAccompanyingExpense) {
        if (!values.purchaseId || !values.accompanyingExpenseTypeId) {
          throw new Error(
            "Purchase ID and Accompanying Expense Type are required for accompanying expenses."
          );
        }
        const [purchase] = await tx
          .select({ id: purchasesTable.id })
          .from(purchasesTable)
          .where(
            and(
              eq(purchasesTable.id, values.purchaseId),
              eq(purchasesTable.isActive, true)
            )
          );

        if (!purchase) {
          throw new Error("Linked Purchase not found or is inactive.");
        }
        const [accompanyingType] = await tx
          .select({ id: accompanyingExpenseTypesTable.id })
          .from(accompanyingExpenseTypesTable)
          .where(
            and(
              eq(
                accompanyingExpenseTypesTable.id,
                values.accompanyingExpenseTypeId
              ),
              eq(accompanyingExpenseTypesTable.isActive, true)
            )
          );

        if (!accompanyingType) {
          throw new Error(
            "Accompanying Expense Type not found or is inactive."
          );
        }
      }

      // 2. Create the Expense record
      const [newExpense] = await tx
        .insert(expensesTable)
        .values({
          ...values,
          notes: values.notes || null,
          description: values.description || null,
          purchaseId: values.purchaseId || null,
          accompanyingExpenseTypeId: values.accompanyingExpenseTypeId || null,
        })
        .returning();

      // 3. Update the Paying Account balance
      const updatedBalance =
        parseFloat(payingAccount.currentBalance as any) - values.amount;
      await tx
        .update(accountsTable)
        .set({
          currentBalance: updatedBalance,
          updatedAt: new Date(),
        })
        .where(eq(accountsTable.id, payingAccount.id));

      // 4. Create Journal Entries for double-entry accounting
      await createJournalEntry({
        tx,
        entryDate: newExpense.expenseDate,
        referenceType: JournalEntryReferenceType.EXPENSE,
        referenceId: newExpense.id,
        userId: userId,
        description: newExpense.title,
        lines: [
          {
            chartOfAccountId: expenseCategory.chartOfAccountsId ?? "",
            debit: values.amount,
            credit: 0,
            memo: newExpense.title,
          },
          {
            chartOfAccountId: payingAccount.chartOfAccountsId ?? "",
            debit: 0,
            credit: values.amount,
            memo: `Payment from ${payingAccount.name}`,
          },
        ],
      });

      return newExpense;
    });

    revalidatePath("/expenses");
    revalidatePath("/accounting-and-finance/expenses");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating expense:", error);
    throw new Error(error.message || "Failed to create expense.");
  }
};

// Get all Expenses with pagination and filtering
export const getExpenses = async (
  page: number = 0,
  limit: number = 10,
  getAll: boolean = false,
  filters?: any
) => {
  try {
    const result = await db.transaction(async (tx) => {
      let query = tx
        .select({
          expense: expensesTable,
          category: expenseCategoriesTable,
          payingAccount: accountsTable,
          purchase: purchasesTable,
          accompanyingExpenseType: accompanyingExpenseTypesTable,
        })
        .from(expensesTable)
        .leftJoin(
          expenseCategoriesTable,
          eq(expensesTable.expenseCategoryId, expenseCategoriesTable.id)
        )
        .leftJoin(
          accountsTable,
          eq(expensesTable.payingAccountId, accountsTable.id)
        )
        .leftJoin(
          purchasesTable,
          eq(expensesTable.purchaseId, purchasesTable.id)
        )
        .leftJoin(
          accompanyingExpenseTypesTable,
          eq(
            expensesTable.accompanyingExpenseTypeId,
            accompanyingExpenseTypesTable.id
          )
        )
        .where(eq(expensesTable.isActive, true))
        .$dynamic();

      const conditions = buildExpenseFilterConditions(filters ?? {});
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(expensesTable.expenseDate));

      let totalCount = 0;
      if (!getAll) {
        // For total count, ensure we apply all conditions
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(expensesTable)
          .leftJoin(
            expenseCategoriesTable,
            eq(expensesTable.expenseCategoryId, expenseCategoriesTable.id)
          )
          .leftJoin(
            accountsTable,
            eq(expensesTable.payingAccountId, accountsTable.id)
          )
          .leftJoin(
            purchasesTable,
            eq(expensesTable.purchaseId, purchasesTable.id)
          )
          .leftJoin(
            accompanyingExpenseTypesTable,
            eq(
              expensesTable.accompanyingExpenseTypeId,
              accompanyingExpenseTypesTable.id
            )
          )
          .where(and(eq(expensesTable.isActive, true), ...conditions));
        totalCount = countResult?.count || 0;

        query = query.limit(limit).offset(page * limit);
      } else {
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(expensesTable)
          .leftJoin(
            expenseCategoriesTable,
            eq(expensesTable.expenseCategoryId, expenseCategoriesTable.id)
          )
          .leftJoin(
            accountsTable,
            eq(expensesTable.payingAccountId, accountsTable.id)
          )
          .leftJoin(
            purchasesTable,
            eq(expensesTable.purchaseId, purchasesTable.id)
          )
          .leftJoin(
            accompanyingExpenseTypesTable,
            eq(
              expensesTable.accompanyingExpenseTypeId,
              accompanyingExpenseTypesTable.id
            )
          )
          .where(and(eq(expensesTable.isActive, true), ...conditions));
        totalCount = countResult?.count || 0;
      }

      const expenses = await query;

      return {
        documents: expenses,
        total: totalCount,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error: any) {
    console.error("Error fetching Expenses:", error);
    throw new Error(error.message || "Failed to fetch expenses.");
  }
};

// Get a single Expense by ID
export const getExpenseById = async (id: string) => {
  try {
    const expense = await db
      .select({
        expense: expensesTable,
        category: expenseCategoriesTable,
        payingAccount: accountsTable,
        purchase: purchasesTable, // Include purchase for accompanying expenses
        accompanyingExpenseType: accompanyingExpenseTypesTable, // Include accompanying type
      })
      .from(expensesTable)
      .leftJoin(
        expenseCategoriesTable,
        eq(expensesTable.expenseCategoryId, expenseCategoriesTable.id)
      )
      .leftJoin(
        accountsTable,
        eq(expensesTable.payingAccountId, accountsTable.id)
      )
      .leftJoin(purchasesTable, eq(expensesTable.purchaseId, purchasesTable.id))
      .leftJoin(
        accompanyingExpenseTypesTable,
        eq(
          expensesTable.accompanyingExpenseTypeId,
          accompanyingExpenseTypesTable.id
        )
      )
      .where(and(eq(expensesTable.id, id), eq(expensesTable.isActive, true)))
      .then((res) => res[0]);

    return parseStringify(expense);
  } catch (error: any) {
    console.error("Error fetching Expense by ID:", error);
    throw new Error(error.message || "Failed to fetch expense by ID.");
  }
};

// Update an Expense
export const updateExpense = async (
  id: string,
  values: Partial<ExpenseFormValues>,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentExpense = await tx
        .select({
          id: expensesTable.id,
          amount: expensesTable.amount,
          expenseCategoryId: expensesTable.expenseCategoryId,
          payingAccountId: expensesTable.payingAccountId,
          referenceNumber: expensesTable.referenceNumber,
          purchaseId: expensesTable.purchaseId,
          accompanyingExpenseTypeId: expensesTable.accompanyingExpenseTypeId,
          expenseDate: expensesTable.expenseDate,
          title: expensesTable.title,
          isAccompanyingExpense: expensesTable.isAccompanyingExpense,
          notes: expensesTable.notes,
          description: expensesTable.description,
        })
        .from(expensesTable)
        .where(eq(expensesTable.id, id))
        .then((res) => res[0]);

      if (!currentExpense) {
        throw new Error("Expense not found.");
      }

      // Re-validate foreign keys if they are being updated
      if (values.expenseCategoryId) {
        const [expenseCategory] = await tx
          .select({
            id: expenseCategoriesTable.id,
            chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
          })
          .from(expenseCategoriesTable)
          .where(
            and(
              eq(expenseCategoriesTable.id, values.expenseCategoryId),
              eq(expenseCategoriesTable.isActive, true)
            )
          );
        if (!expenseCategory) {
          throw new Error("Expense Category not found or is inactive.");
        }
      }

      // Re-validate paying account if updated, and check balance impact
      let newPayingAccountBalance: number | undefined;
      let newPayingAccountCoAId: string | undefined;
      let newPayingAccountName: string | undefined;
      let oldPayingAccountCoAId: string | undefined = undefined;

      const currentPayingAccount = await tx
        .select({
          id: accountsTable.id,
          chartOfAccountsId: accountsTable.chartOfAccountsId,
          currentBalance: accountsTable.currentBalance,
          name: accountsTable.name,
        })
        .from(accountsTable)
        .where(
          currentExpense.payingAccountId !== null
            ? eq(accountsTable.id, currentExpense.payingAccountId)
            : sql`false`
        )
        .then((res) => res[0]);

      if (!currentPayingAccount) {
        throw new Error("Original paying account not found or is inactive.");
      }
      oldPayingAccountCoAId =
        currentPayingAccount.chartOfAccountsId ?? undefined;

      if (
        values.payingAccountId &&
        values.payingAccountId !== currentExpense.payingAccountId
      ) {
        const [newPayingAccount] = await tx
          .select({
            id: accountsTable.id,
            chartOfAccountsId: accountsTable.chartOfAccountsId,
            currentBalance: accountsTable.currentBalance,
            name: accountsTable.name,
          })
          .from(accountsTable)
          .where(
            and(
              eq(accountsTable.id, values.payingAccountId),
              eq(accountsTable.isActive, true)
            )
          );
        if (!newPayingAccount) {
          throw new Error("New Paying Account not found or is inactive.");
        }
        newPayingAccountCoAId = newPayingAccount.chartOfAccountsId ?? undefined;
        newPayingAccountName = newPayingAccount.name ?? undefined;

        // Check if new account has enough funds for the new amount (if amount changed) or original amount
        const effectiveAmount =
          values.amount !== undefined ? values.amount : currentExpense.amount;
        if (newPayingAccount.currentBalance < effectiveAmount) {
          throw new Error("Insufficient funds in the new paying account.");
        }
      } else {
        // Paying account is not changing, use current's CoA ID
        newPayingAccountCoAId =
          currentPayingAccount.chartOfAccountsId ?? undefined;
        newPayingAccountName = currentPayingAccount.name ?? undefined;
      }

      // Check unique reference number if updated
      if (
        values.referenceNumber &&
        values.referenceNumber !== currentExpense.referenceNumber
      ) {
        const existingRef = await tx
          .select({ id: expensesTable.id })
          .from(expensesTable)
          .where(
            and(
              eq(expensesTable.referenceNumber, values.referenceNumber),
              sql`${expensesTable.id} != ${id}`
            )
          );
        if (existingRef.length > 0) {
          throw new Error(
            "Expense reference number already exists for another expense."
          );
        }
      }

      // Re-validate accompanying expense details if updated
      const isAccompanyingExpenseUpdated =
        values.isAccompanyingExpense !== undefined
          ? values.isAccompanyingExpense
          : currentExpense.isAccompanyingExpense;
      const newPurchaseId =
        values.purchaseId !== undefined
          ? values.purchaseId
          : currentExpense.purchaseId;
      const newAccompanyingTypeId =
        values.accompanyingExpenseTypeId !== undefined
          ? values.accompanyingExpenseTypeId
          : currentExpense.accompanyingExpenseTypeId;

      if (isAccompanyingExpenseUpdated) {
        if (!newPurchaseId || !newAccompanyingTypeId) {
          throw new Error(
            "Purchase ID and Accompanying Expense Type are required for accompanying expenses."
          );
        }
        const [purchase] = await tx
          .select({ id: purchasesTable.id })
          .from(purchasesTable)
          .where(
            and(
              eq(purchasesTable.id, newPurchaseId),
              eq(purchasesTable.isActive, true)
            )
          );
        if (!purchase) {
          throw new Error("Linked Purchase not found or is inactive.");
        }
        const [accompanyingType] = await tx
          .select({ id: accompanyingExpenseTypesTable.id })
          .from(accompanyingExpenseTypesTable)
          .where(
            and(
              eq(accompanyingExpenseTypesTable.id, newAccompanyingTypeId),
              eq(accompanyingExpenseTypesTable.isActive, true)
            )
          );
        if (!accompanyingType) {
          throw new Error(
            "Accompanying Expense Type not found or is inactive."
          );
        }
      }

      // Calculate balance adjustments before updating
      const oldAmount = parseFloat(currentExpense.amount as any);
      const newAmount = values.amount !== undefined ? values.amount : oldAmount;

      // Adjust old paying account
      if (
        currentExpense.payingAccountId === values.payingAccountId ||
        values.payingAccountId === undefined
      ) {
        // Account not changing or changing to itself: Adjust original account balance
        const balanceChange = newAmount - oldAmount;
        newPayingAccountBalance =
          parseFloat(currentPayingAccount.currentBalance as any) -
          balanceChange;
        if (newPayingAccountBalance < 0) {
          throw new Error(
            "Insufficient funds in the paying account for this update."
          );
        }
        await tx
          .update(accountsTable)
          .set({
            currentBalance: newPayingAccountBalance,
            updatedAt: new Date(),
          })
          .where(
            currentExpense.payingAccountId !== null
              ? eq(accountsTable.id, currentExpense.payingAccountId)
              : sql`false`
          );
      } else {
        // Account is changing: Restore old account, deduct from new account
        const restoredBalance =
          parseFloat(currentPayingAccount.currentBalance as any) + oldAmount;
        await tx
          .update(accountsTable)
          .set({ currentBalance: restoredBalance, updatedAt: new Date() })
          .where(
            currentExpense.payingAccountId !== null
              ? eq(accountsTable.id, currentExpense.payingAccountId)
              : sql`false`
          );

        const newAccountForDeduction = await tx
          .select({
            id: accountsTable.id,
            currentBalance: accountsTable.currentBalance,
          })
          .from(accountsTable)
          .where(eq(accountsTable.id, values.payingAccountId))
          .then((res) => res[0]);

        if (!newAccountForDeduction)
          throw new Error("Target paying account for update not found.");

        const deductedBalance =
          parseFloat(newAccountForDeduction.currentBalance as any) - newAmount;
        if (deductedBalance < 0) {
          throw new Error(
            "Insufficient funds in the new paying account for this update."
          );
        }
        await tx
          .update(accountsTable)
          .set({ currentBalance: deductedBalance, updatedAt: new Date() })
          .where(eq(accountsTable.id, newAccountForDeduction.id));
      }

      // Update the Expense record
      const [updatedExpense] = await tx
        .update(expensesTable)
        .set({
          ...values,
          notes:
            values.notes === null ? null : values.notes || currentExpense.notes,
          description:
            values.description === null
              ? null
              : values.description || currentExpense.description,
          purchaseId: values.purchaseId || currentExpense.purchaseId,
          accompanyingExpenseTypeId:
            values.accompanyingExpenseTypeId ||
            currentExpense.accompanyingExpenseTypeId,
          payingAccountId: values.payingAccountId,
          updatedAt: new Date(),
        })
        .where(eq(expensesTable.id, id))
        .returning();

      if (!updatedExpense) {
        throw new Error("Expense not found or could not be updated.");
      }

      // Reverse existing journal entry and create a new one, or create an adjustment entry
      // For simplicity and audit trail, an "adjustment" journal entry is usually preferred for updates.
      // This will debit/credit the original accounts to reverse the old entry, then debit/credit new accounts for the new entry.
      await createJournalEntry({
        tx,
        entryDate: new Date(),
        referenceType: JournalEntryReferenceType.ADJUSTMENT,
        referenceId: updatedExpense.id,
        userId,
        description: `Adjustment for expense: ${updatedExpense.title}`,
        lines: [
          // Reversal of original expense
          {
            chartOfAccountId: oldPayingAccountCoAId!, // Debit original cash/bank account (restore)
            debit: oldAmount,
            credit: 0,
            memo: `Reversal: restore funds to ${currentPayingAccount.name}`,
          },
          {
            chartOfAccountId:
              (await tx
                .select({
                  chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
                })
                .from(expenseCategoriesTable)
                .where(
                  eq(
                    expenseCategoriesTable.id,
                    currentExpense.expenseCategoryId ?? ""
                  )
                )
                .then((res) => res[0]?.chartOfAccountsId)) ||
              throwError("Original expense category not found for reversal."),
            debit: 0,
            credit: oldAmount,
            memo: `Reversal: reduce ${currentExpense.title} expense`,
          },
          // New expense entry
          {
            chartOfAccountId:
              (await tx
                .select({
                  chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
                })
                .from(expenseCategoriesTable)
                .where(
                  eq(
                    expenseCategoriesTable.id,
                    updatedExpense.expenseCategoryId ?? ""
                  )
                )
                .then((res) => res[0]?.chartOfAccountsId)) ||
              throwError("New expense category not found."), // Debit new expense account
            debit: newAmount,
            credit: 0,
            memo: `New: record ${updatedExpense.title} expense`,
          },
          {
            chartOfAccountId: newPayingAccountCoAId!, // Credit new cash/bank account (deduct)
            debit: 0,
            credit: newAmount,
            memo: `New: payment from ${newPayingAccountName}`,
          },
        ],
      });

      return updatedExpense;
    });

    revalidatePath("/expenses");
    revalidatePath("/accounting-and-finance/expenses");
    revalidatePath(`/expenses/edit-expense/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating expense:", error);
    throw new Error(error.message || "Failed to update expense.");
  }
};

// Soft delete an Expense
export const softDeleteExpense = async (id: string, userId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentExpense = await tx
        .select({
          id: expensesTable.id,
          amount: expensesTable.amount,
          payingAccountId: expensesTable.payingAccountId,
          expenseCategoryId: expensesTable.expenseCategoryId,
          expenseDate: expensesTable.expenseDate,
          title: expensesTable.title,
        })
        .from(expensesTable)
        .where(eq(expensesTable.id, id))
        .then((res) => res[0]);

      if (!currentExpense) {
        throw new Error("Expense not found.");
      }

      // Restore the amount to the paying account
      const [payingAccount] = await tx
        .select({
          id: accountsTable.id,
          chartOfAccountsId: accountsTable.chartOfAccountsId,
          currentBalance: accountsTable.currentBalance,
          name: accountsTable.name,
        })
        .from(accountsTable)
        .where(
          currentExpense.payingAccountId !== null
            ? eq(accountsTable.id, currentExpense.payingAccountId)
            : sql`false`
        );

      if (!payingAccount) {
        throw new Error("Paying account linked to expense not found.");
      }

      const restoredBalance =
        parseFloat(payingAccount.currentBalance as any) +
        parseFloat(currentExpense.amount as any);
      await tx
        .update(accountsTable)
        .set({ currentBalance: restoredBalance, updatedAt: new Date() })
        .where(eq(accountsTable.id, payingAccount.id));

      // Deactivate the expense record
      const [updatedExpense] = await tx
        .update(expensesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(expensesTable.id, id))
        .returning();

      // Create a reversal journal entry
      await createJournalEntry({
        tx,
        entryDate: new Date(),
        referenceType: JournalEntryReferenceType.ADJUSTMENT,
        referenceId: updatedExpense.id,
        userId,
        description: `Reversal of expense: ${updatedExpense.title}`,
        lines: [
          {
            chartOfAccountId: payingAccount.chartOfAccountsId ?? "", // Debit cash/bank account (restore funds)
            debit: parseFloat(updatedExpense.amount as any),
            credit: 0,
            memo: `Reversal: funds restored to ${payingAccount.name}`,
          },
          {
            chartOfAccountId:
              (await tx
                .select({
                  chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
                })
                .from(expenseCategoriesTable)
                .where(
                  eq(
                    expenseCategoriesTable.id,
                    updatedExpense.expenseCategoryId ?? ""
                  )
                )
                .then((res) => res[0]?.chartOfAccountsId)) ||
              throwError("Expense category not found for reversal."), // Credit expense account (reduce expense)
            debit: 0,
            credit: parseFloat(updatedExpense.amount as any),
            memo: `Reversal: expense reduced for ${updatedExpense.title}`,
          },
        ],
      });

      return updatedExpense;
    });

    revalidatePath("/expenses");
    revalidatePath("/accounting-and-finance/expenses");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting expense:", error);
    throw new Error(error.message || "Failed to deactivate expense.");
  }
};

// Helper to throw errors explicitly for async functions
function throwError(message: string): never {
  throw new Error(message);
}

// Generate reference number
export const generateExpenseReferenceNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastExpense = await tx
        .select({ referenceNumber: expensesTable.referenceNumber })
        .from(expensesTable)
        .where(sql`reference_number LIKE ${`EXP.${year}/${month}/%`}`)
        .orderBy(desc(expensesTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastExpense.length > 0) {
        const lastReferenceNumber = lastExpense[0].referenceNumber;
        const lastSequence = parseInt(
          lastReferenceNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `EXP.${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating expense reference number:", error);
    throw error;
  }
};
