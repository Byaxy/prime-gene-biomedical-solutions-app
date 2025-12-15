/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { parseStringify } from "../utils";
import { ExpenseFormValues, ExpenseItemFormValues } from "../validation";
import { db } from "@/drizzle/db";
import {
  accompanyingExpenseTypesTable,
  accountsTable,
  expenseCategoriesTable,
  expenseItemsTable,
  expensesTable,
  purchasesTable,
} from "@/drizzle/schema";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { Account, JournalEntryReferenceType } from "@/types";
import { createJournalEntry } from "./accounting.actions";
import { ExpenseFilters } from "@/hooks/useExpenses";

const buildExpenseFilterConditions = (filters: ExpenseFilters) => {
  const conditions = [];

  conditions.push(eq(expensesTable.isActive, true));

  if (filters.search?.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(expensesTable.referenceNumber, searchTerm),
        ilike(expenseCategoriesTable.name, searchTerm),
        ilike(accountsTable.name, searchTerm)
      )
    );
  }

  if (filters.expenseCategoryId) {
    conditions.push(
      eq(expenseItemsTable.expenseCategoryId, filters.expenseCategoryId)
    );
  }

  // Updated: filter by payingAccountId on expense items, not expense header
  if (filters.payingAccountId) {
    conditions.push(
      eq(expenseItemsTable.payingAccountId, filters.payingAccountId)
    );
  }

  if (filters.purchaseId) {
    conditions.push(eq(expenseItemsTable.purchaseId, filters.purchaseId));
  }
  if (filters.accompanyingExpenseTypeId) {
    conditions.push(
      eq(
        expenseItemsTable.accompanyingExpenseTypeId,
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

export const addExpense = async (userId: string, values: ExpenseFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Validate all paying accounts and check balances for each item
      const accountValidationPromises = values.items.map(async (item: any) => {
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
              eq(accountsTable.id, item.payingAccountId),
              eq(accountsTable.isActive, true)
            )
          );

        if (!payingAccount) {
          throw new Error(
            `Paying Account for item '${item.title}' not found or is inactive.`
          );
        }

        if (parseFloat(payingAccount.currentBalance as any) < item.itemAmount) {
          throw new Error(
            `Insufficient funds in account '${payingAccount.name}' for item '${item.title}'. Available: ${payingAccount.currentBalance}, Required: ${item.itemAmount}`
          );
        }

        return { item, payingAccount };
      });

      const validatedAccountsForItems = await Promise.all(
        accountValidationPromises
      );

      // 2. Check if reference number is unique
      const existingExpenseWithRef = await tx
        .select({ id: expensesTable.id })
        .from(expensesTable)
        .where(eq(expensesTable.referenceNumber, values.referenceNumber));
      if (existingExpenseWithRef.length > 0) {
        throw new Error(
          "Expense reference number already exists for an active expense report."
        );
      }

      // 3. Validate all Line Item FKs and Accompanying Expense logic
      const expenseItemValidationPromises = values.items.map(
        async (item: any) => {
          const [expenseCategory] = await tx
            .select({
              id: expenseCategoriesTable.id,
              chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
            })
            .from(expenseCategoriesTable)
            .where(
              and(
                eq(expenseCategoriesTable.id, item.expenseCategoryId),
                eq(expenseCategoriesTable.isActive, true)
              )
            );
          if (!expenseCategory) {
            throw new Error(
              `Expense Category '${item.expenseCategoryId}' for item '${item.title}' not found or is inactive.`
            );
          }

          if (item.isAccompanyingExpense) {
            if (!item.purchaseId || !item.accompanyingExpenseTypeId) {
              throw new Error(
                `Purchase ID and Accompanying Expense Type are required for accompanying expense item '${item.title}'.`
              );
            }
            const [purchase] = await tx
              .select({ id: purchasesTable.id })
              .from(purchasesTable)
              .where(
                and(
                  eq(purchasesTable.id, item.purchaseId),
                  eq(purchasesTable.isActive, true)
                )
              );
            if (!purchase) {
              throw new Error(
                `Linked Purchase '${item.purchaseId}' for item '${item.title}' not found or is inactive.`
              );
            }
            const [accompanyingType] = await tx
              .select({ id: accompanyingExpenseTypesTable.id })
              .from(accompanyingExpenseTypesTable)
              .where(
                and(
                  eq(
                    accompanyingExpenseTypesTable.id,
                    item.accompanyingExpenseTypeId
                  ),
                  eq(accompanyingExpenseTypesTable.isActive, true)
                )
              );
            if (!accompanyingType) {
              throw new Error(
                `Accompanying Expense Type '${item.accompanyingExpenseTypeId}' for item '${item.title}' not found or is inactive.`
              );
            }
          }
          return {
            ...item,
            expenseCategoryCoAId: expenseCategory.chartOfAccountsId,
          };
        }
      );
      const validatedItems = await Promise.all(expenseItemValidationPromises);

      // 4. Create the Expense Header record
      const [newExpenseHeader] = await tx
        .insert(expensesTable)
        .values({
          amount: values.amount,
          expenseDate: values.expenseDate,
          referenceNumber: values.referenceNumber,
          notes: values.notes || null,
          attachments: values.attachments,
        })
        .returning();

      // 5. Create Expense Line Item records with paying account
      const expenseItemsData = validatedItems.map((item) => ({
        expenseId: newExpenseHeader.id,
        title: item.title,
        itemAmount: item.itemAmount,
        expenseCategoryId: item.expenseCategoryId,
        payee: item.payee,
        notes: item.notes || null,
        isAccompanyingExpense: item.isAccompanyingExpense,
        purchaseId: item.purchaseId || null,
        accompanyingExpenseTypeId: item.accompanyingExpenseTypeId || null,
        payingAccountId: item.payingAccountId,
      }));
      await tx.insert(expenseItemsTable).values(expenseItemsData);

      // 6. Update each Paying Account balance
      for (const { item, payingAccount } of validatedAccountsForItems) {
        const updatedBalance =
          parseFloat(payingAccount.currentBalance as any) - item.itemAmount;
        await tx
          .update(accountsTable)
          .set({
            currentBalance: updatedBalance,
            updatedAt: new Date(),
          })
          .where(eq(accountsTable.id, payingAccount.id));
      }

      // 7. Create Journal Entries for double-entry accounting
      const journalLines: Array<{
        chartOfAccountId: string;
        debit: number;
        credit: number;
        memo?: string;
      }> = [];

      // Debit for each individual expense line item's category
      validatedItems.forEach((item) => {
        journalLines.push({
          chartOfAccountId:
            item.expenseCategoryCoAId ??
            throwError(`CoA not found for category ${item.expenseCategoryId}`),
          debit: item.itemAmount,
          credit: 0,
          memo: `${item.title} (Payee: ${item.payee})`,
        });
      });

      // Credit each paying account for the amount it paid
      for (const { item, payingAccount } of validatedAccountsForItems) {
        journalLines.push({
          chartOfAccountId:
            payingAccount.chartOfAccountsId ??
            throwError("Paying account CoA not found."),
          debit: 0,
          credit: item.itemAmount,
          memo: `Payment from ${payingAccount.name} for item '${item.title}' in expense report ${newExpenseHeader.referenceNumber}`,
        });
      }

      await createJournalEntry({
        tx,
        entryDate: newExpenseHeader.expenseDate,
        referenceType: JournalEntryReferenceType.EXPENSE,
        referenceId: newExpenseHeader.id,
        userId,
        description: newExpenseHeader.referenceNumber,
        lines: journalLines,
      });

      revalidatePath("/expenses");
      revalidatePath("/accounting-and-finance/expenses");

      return newExpenseHeader;
    });

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating expense report:", error);
    throw new Error(error.message || "Failed to create expense report.");
  }
};

export const getExpenses = async (
  page: number = 0,
  limit: number = 10,
  getAll: boolean = false,
  filters?: ExpenseFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // UPDATED: No longer join payingAccount at expense level
      let expensesQuery = tx
        .select({
          expense: expensesTable,
        })
        .from(expensesTable)
        .$dynamic();

      const conditions = buildExpenseFilterConditions(filters ?? {});

      // Check if we have filters that affect line items or need account info
      const hasLineItemFilters =
        filters &&
        (filters.expenseCategoryId ||
          filters.payingAccountId ||
          filters.purchaseId ||
          filters.accompanyingExpenseTypeId);

      if (hasLineItemFilters) {
        // When filtering by line items, we need a subquery to get distinct expense IDs
        const filteredExpenseIdsQuery = tx
          .selectDistinct({ id: expensesTable.id })
          .from(expensesTable)
          .leftJoin(
            expenseItemsTable,
            eq(expensesTable.id, expenseItemsTable.expenseId)
          )
          .leftJoin(
            expenseCategoriesTable,
            eq(expenseItemsTable.expenseCategoryId, expenseCategoriesTable.id)
          )
          .leftJoin(
            accountsTable,
            eq(expenseItemsTable.payingAccountId, accountsTable.id)
          )
          .leftJoin(
            purchasesTable,
            eq(expenseItemsTable.purchaseId, purchasesTable.id)
          )
          .leftJoin(
            accompanyingExpenseTypesTable,
            eq(
              expenseItemsTable.accompanyingExpenseTypeId,
              accompanyingExpenseTypesTable.id
            )
          )
          .$dynamic();

        if (conditions.length > 0) {
          filteredExpenseIdsQuery.where(and(...conditions));
        }

        filteredExpenseIdsQuery.orderBy(desc(expensesTable.expenseDate));

        if (!getAll && limit > 0) {
          filteredExpenseIdsQuery.limit(limit).offset(page * limit);
        }

        const filteredIds = await filteredExpenseIdsQuery;
        const expenseIds = filteredIds.map((e) => e.id);

        if (expenseIds.length === 0) {
          return { documents: [], total: 0 };
        }

        // Get the full expense records for these IDs
        const expenses = await tx
          .select({
            expense: expensesTable,
          })
          .from(expensesTable)
          .where(inArray(expensesTable.id, expenseIds))
          .orderBy(desc(expensesTable.createdAt));

        // Get all line items with their paying accounts for these expenses
        const lineItems = await tx
          .select({
            expenseItem: expenseItemsTable,
            category: expenseCategoriesTable,
            payingAccount: accountsTable,
            purchase: purchasesTable,
            accompanyingExpenseType: accompanyingExpenseTypesTable,
          })
          .from(expenseItemsTable)
          .leftJoin(
            expenseCategoriesTable,
            eq(expenseItemsTable.expenseCategoryId, expenseCategoriesTable.id)
          )
          .leftJoin(
            accountsTable,
            eq(expenseItemsTable.payingAccountId, accountsTable.id)
          )
          .leftJoin(
            purchasesTable,
            eq(expenseItemsTable.purchaseId, purchasesTable.id)
          )
          .leftJoin(
            accompanyingExpenseTypesTable,
            eq(
              expenseItemsTable.accompanyingExpenseTypeId,
              accompanyingExpenseTypesTable.id
            )
          )
          .where(inArray(expenseItemsTable.expenseId, expenseIds))
          .orderBy(expenseItemsTable.createdAt);

        // Combine the data
        const expensesWithItems = expenses.map((expense) => ({
          ...expense,
          items: lineItems
            .filter((item) => item.expenseItem.expenseId === expense.expense.id)
            .map((item) => ({
              expenseItem: item.expenseItem,
              category: item.category,
              payingAccount: item.payingAccount,
              purchase: item.purchase,
              accompanyingExpenseType: item.accompanyingExpenseType,
            })),
        }));

        // Get total count
        let totalQuery = tx
          .select({ count: sql<number>`count(DISTINCT ${expensesTable.id})` })
          .from(expensesTable)
          .leftJoin(
            expenseItemsTable,
            eq(expensesTable.id, expenseItemsTable.expenseId)
          )
          .leftJoin(
            expenseCategoriesTable,
            eq(expenseItemsTable.expenseCategoryId, expenseCategoriesTable.id)
          )
          .leftJoin(
            accountsTable,
            eq(expenseItemsTable.payingAccountId, accountsTable.id)
          )
          .leftJoin(
            purchasesTable,
            eq(expenseItemsTable.purchaseId, purchasesTable.id)
          )
          .leftJoin(
            accompanyingExpenseTypesTable,
            eq(
              expenseItemsTable.accompanyingExpenseTypeId,
              accompanyingExpenseTypesTable.id
            )
          )
          .$dynamic();

        if (conditions.length > 0) {
          totalQuery = totalQuery.where(and(...conditions));
        }

        const total = getAll
          ? expenses.length
          : await totalQuery.then((res) => res[0]?.count || 0);

        return {
          documents: expensesWithItems,
          total,
        };
      } else {
        // Simple case: no line item filters
        if (conditions.length > 0) {
          expensesQuery = expensesQuery.where(and(...conditions));
        }

        expensesQuery = expensesQuery.orderBy(desc(expensesTable.expenseDate));

        if (!getAll && limit > 0) {
          expensesQuery = expensesQuery.limit(limit).offset(page * limit);
        }

        const expenses = await expensesQuery;

        // Get all line items with their paying accounts for these expenses
        const expenseIds = expenses.map((e) => e.expense.id);
        const lineItems =
          expenseIds.length > 0
            ? await tx
                .select({
                  expenseItem: expenseItemsTable,
                  category: expenseCategoriesTable,
                  payingAccount: accountsTable,
                  purchase: purchasesTable,
                  accompanyingExpenseType: accompanyingExpenseTypesTable,
                })
                .from(expenseItemsTable)
                .leftJoin(
                  expenseCategoriesTable,
                  eq(
                    expenseItemsTable.expenseCategoryId,
                    expenseCategoriesTable.id
                  )
                )
                .leftJoin(
                  accountsTable,
                  eq(expenseItemsTable.payingAccountId, accountsTable.id)
                )
                .leftJoin(
                  purchasesTable,
                  eq(expenseItemsTable.purchaseId, purchasesTable.id)
                )
                .leftJoin(
                  accompanyingExpenseTypesTable,
                  eq(
                    expenseItemsTable.accompanyingExpenseTypeId,
                    accompanyingExpenseTypesTable.id
                  )
                )
                .where(inArray(expenseItemsTable.expenseId, expenseIds))
                .orderBy(expenseItemsTable.createdAt)
            : [];

        // Combine the data
        const expensesWithItems = expenses.map((expense) => ({
          ...expense,
          items: lineItems
            .filter((item) => item.expenseItem.expenseId === expense.expense.id)
            .map((item) => ({
              expenseItem: item.expenseItem,
              category: item.category,
              payingAccount: item.payingAccount,
              purchase: item.purchase,
              accompanyingExpenseType: item.accompanyingExpenseType,
            })),
        }));

        // Get total count for pagination
        let totalQuery = tx
          .select({ count: sql<number>`count(*)` })
          .from(expensesTable)
          .$dynamic();

        if (conditions.length > 0) {
          totalQuery = totalQuery.where(and(...conditions));
        }

        const total = getAll
          ? expenses.length
          : await totalQuery.then((res) => res[0]?.count || 0);

        return {
          documents: expensesWithItems,
          total,
        };
      }
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

// Get Expense by ID
export const getExpenseById = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Get the main expense record (no payingAccount join)
      const expense = await tx
        .select({
          expense: expensesTable,
        })
        .from(expensesTable)
        .where(and(eq(expensesTable.id, id), eq(expensesTable.isActive, true)))
        .then((res) => res[0]);

      if (!expense) {
        return null;
      }

      // Get all line items with their paying accounts for this expense
      const lineItems = await tx
        .select({
          expenseItem: expenseItemsTable,
          category: expenseCategoriesTable,
          payingAccount: accountsTable,
          purchase: purchasesTable,
          accompanyingExpenseType: accompanyingExpenseTypesTable,
        })
        .from(expenseItemsTable)
        .leftJoin(
          expenseCategoriesTable,
          eq(expenseItemsTable.expenseCategoryId, expenseCategoriesTable.id)
        )
        .leftJoin(
          accountsTable,
          eq(expenseItemsTable.payingAccountId, accountsTable.id)
        )
        .leftJoin(
          purchasesTable,
          eq(expenseItemsTable.purchaseId, purchasesTable.id)
        )
        .leftJoin(
          accompanyingExpenseTypesTable,
          eq(
            expenseItemsTable.accompanyingExpenseTypeId,
            accompanyingExpenseTypesTable.id
          )
        )
        .where(eq(expenseItemsTable.expenseId, id))
        .orderBy(expenseItemsTable.createdAt);

      const expenseWithItems = {
        ...expense,
        items: lineItems.map((item) => ({
          expenseItem: item.expenseItem,
          category: item.category,
          payingAccount: item.payingAccount,
          purchase: item.purchase,
          accompanyingExpenseType: item.accompanyingExpenseType,
        })),
      };

      return parseStringify(expenseWithItems);
    });

    return result;
  } catch (error: any) {
    console.error("Error fetching Expense by ID:", error);
    throw new Error(error.message || "Failed to fetch expense by ID.");
  }
};

// ---  Update an Expense (to handle multiple line items) ---
export const updateExpense = async (
  id: string,
  values: Partial<ExpenseFormValues>,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Get current expense header and its line items with paying accounts
      const currentExpenseHeader = await tx.query.expensesTable.findFirst({
        where: eq(expensesTable.id, id),
      });
      if (!currentExpenseHeader) {
        throw new Error("Expense header not found.");
      }

      const currentLineItems = await tx
        .select({
          expenseItem: expenseItemsTable,
          payingAccount: accountsTable,
        })
        .from(expenseItemsTable)
        .leftJoin(
          accountsTable,
          eq(expenseItemsTable.payingAccountId, accountsTable.id)
        )
        .where(eq(expenseItemsTable.expenseId, id));

      const currentLineItemIds = new Set(
        currentLineItems.map((item) => item.expenseItem.id)
      );

      // 2. Reference Number uniqueness check (excluding current expense)
      if (
        values.referenceNumber &&
        values.referenceNumber !== currentExpenseHeader.referenceNumber
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
            "Expense reference number already exists for another active expense report."
          );
        }
      }

      // 3. Validate all paying accounts for new/updated items and their current balances
      const validatedAccountsForItems: Array<{
        item: ExpenseItemFormValues;
        payingAccount: Pick<
          Account,
          "id" | "chartOfAccountsId" | "currentBalance" | "name"
        >;
      }> = [];

      for (const item of values.items || []) {
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
              eq(accountsTable.id, item.payingAccountId),
              eq(accountsTable.isActive, true)
            )
          );

        if (!payingAccount) {
          throw new Error(
            `Paying Account for item '${item.title}' not found or is inactive.`
          );
        }
        validatedAccountsForItems.push({ item, payingAccount });
      }

      // 4. Process Expense Line Items (Create, Update, Delete)
      const lineItemsToCreate: ExpenseItemFormValues[] = [];
      const lineItemsToUpdate: ExpenseItemFormValues[] = [];
      const newLineItemIds = new Set<string>();

      const itemValidationPromises = (values.items || []).map(async (item) => {
        // Validate Expense Category for the line item
        const [expenseCategory] = await tx
          .select({
            id: expenseCategoriesTable.id,
            chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
          })
          .from(expenseCategoriesTable)
          .where(
            and(
              eq(expenseCategoriesTable.id, item.expenseCategoryId),
              eq(expenseCategoriesTable.isActive, true)
            )
          );
        if (!expenseCategory) {
          throw new Error(
            `Expense Category '${item.expenseCategoryId}' for item '${item.title}' not found or is inactive.`
          );
        }

        // Validate Accompanying Expense fields if applicable
        if (item.isAccompanyingExpense) {
          if (!item.purchaseId || !item.accompanyingExpenseTypeId) {
            throw new Error(
              `Purchase ID and Accompanying Expense Type are required for accompanying expense item '${item.title}'.`
            );
          }
          const [purchase] = await tx
            .select({ id: purchasesTable.id })
            .from(purchasesTable)
            .where(
              and(
                eq(purchasesTable.id, item.purchaseId),
                eq(purchasesTable.isActive, true)
              )
            );
          if (!purchase) {
            throw new Error(
              `Linked Purchase '${item.purchaseId}' for item '${item.title}' not found or is inactive.`
            );
          }
          const [accompanyingType] = await tx
            .select({ id: accompanyingExpenseTypesTable.id })
            .from(accompanyingExpenseTypesTable)
            .where(
              and(
                eq(
                  accompanyingExpenseTypesTable.id,
                  item.accompanyingExpenseTypeId
                ),
                eq(accompanyingExpenseTypesTable.isActive, true)
              )
            );
          if (!accompanyingType) {
            throw new Error(
              `Accompanying Expense Type '${item.accompanyingExpenseTypeId}' for item '${item.title}' not found or is inactive.`
            );
          }
        }

        // Distinguish between new items and existing items
        if (item.id && currentLineItemIds.has(item.id)) {
          lineItemsToUpdate.push(item);
          newLineItemIds.add(item.id);
        } else {
          lineItemsToCreate.push(item);
        }
        return {
          ...item,
          expenseCategoryCoAId: expenseCategory.chartOfAccountsId,
        };
      });
      const validatedItems = await Promise.all(itemValidationPromises);

      // Identify items to delete (exist in DB but not in new form data)
      const lineItemsToDelete = currentLineItems.filter(
        (item) => !newLineItemIds.has(item.expenseItem.id)
      );

      // 5. Adjust Paying Account Balances: Restore old, Deduct new
      const accountBalancesToUpdate = new Map<string, number>(); // Map<accountId, netChange>

      // Restore balances for deleted items
      for (const item of lineItemsToDelete) {
        if (item.payingAccount) {
          const oldAmount = parseFloat(item.expenseItem.itemAmount as any);
          accountBalancesToUpdate.set(
            item.payingAccount.id,
            (accountBalancesToUpdate.get(item.payingAccount.id) || 0) +
              oldAmount
          );
        }
      }

      // Process updated and created items
      for (const { item, payingAccount } of validatedAccountsForItems) {
        if (item.id && currentLineItemIds.has(item.id)) {
          // Updated item
          const oldItemWithAccount = currentLineItems.find(
            (li) => li.expenseItem.id === item.id
          );
          if (oldItemWithAccount && oldItemWithAccount.payingAccount) {
            const oldAmount = parseFloat(
              oldItemWithAccount.expenseItem.itemAmount as any
            );
            const newAmount = item.itemAmount;

            // If paying account changed, restore from old and deduct from new
            if (
              item.payingAccountId !==
              oldItemWithAccount.expenseItem.payingAccountId
            ) {
              // Restore to old account
              accountBalancesToUpdate.set(
                oldItemWithAccount.payingAccount.id,
                (accountBalancesToUpdate.get(
                  oldItemWithAccount.payingAccount.id
                ) || 0) + oldAmount
              );
              // Deduct from new account
              accountBalancesToUpdate.set(
                payingAccount.id,
                (accountBalancesToUpdate.get(payingAccount.id) || 0) - newAmount
              );
            } else {
              // Same account, adjust for difference
              const amountChange = newAmount - oldAmount;
              accountBalancesToUpdate.set(
                payingAccount.id,
                (accountBalancesToUpdate.get(payingAccount.id) || 0) -
                  amountChange
              );
            }
          }
        } else {
          // Newly created item: deduct from its paying account
          accountBalancesToUpdate.set(
            payingAccount.id,
            (accountBalancesToUpdate.get(payingAccount.id) || 0) -
              item.itemAmount
          );
        }
      }

      // Apply balance updates
      for (const [accountId, netChange] of accountBalancesToUpdate.entries()) {
        const [account] = await tx
          .select({
            id: accountsTable.id,
            currentBalance: accountsTable.currentBalance,
            name: accountsTable.name,
          })
          .from(accountsTable)
          .where(eq(accountsTable.id, accountId));

        if (!account) {
          throw new Error(
            `Account ${accountId} not found for balance adjustment.`
          );
        }

        const updatedBalance =
          parseFloat(account.currentBalance as any) + netChange;
        if (updatedBalance < 0) {
          throw new Error(
            `Insufficient funds in account '${account.name}' for this update.`
          );
        }

        await tx
          .update(accountsTable)
          .set({
            currentBalance: updatedBalance,
            updatedAt: new Date(),
          })
          .where(eq(accountsTable.id, accountId));
      }

      // 6. Execute Line Item CUD Operations
      // Delete old line items
      if (lineItemsToDelete.length > 0) {
        await tx.delete(expenseItemsTable).where(
          inArray(
            expenseItemsTable.id,
            lineItemsToDelete.map((item) => item.expenseItem.id)
          )
        );
      }

      // Update existing line items
      await Promise.all(
        lineItemsToUpdate.map((item) =>
          tx
            .update(expenseItemsTable)
            .set({
              title: item.title,
              itemAmount: item.itemAmount,
              expenseCategoryId: item.expenseCategoryId,
              payee: item.payee,
              notes: item.notes || null,
              isAccompanyingExpense: item.isAccompanyingExpense,
              purchaseId: item.purchaseId || null,
              accompanyingExpenseTypeId: item.accompanyingExpenseTypeId || null,
              payingAccountId: item.payingAccountId, // Added payingAccountId update
              updatedAt: new Date(),
            })
            .where(eq(expenseItemsTable.id, item.id!))
        )
      );

      // Insert new line items
      if (lineItemsToCreate.length > 0) {
        const insertData = lineItemsToCreate.map((item) => ({
          expenseId: id,
          title: item.title,
          itemAmount: item.itemAmount,
          expenseCategoryId: item.expenseCategoryId,
          payee: item.payee,
          notes: item.notes || null,
          isAccompanyingExpense: item.isAccompanyingExpense,
          purchaseId: item.purchaseId || null,
          accompanyingExpenseTypeId: item.accompanyingExpenseTypeId || null,
          payingAccountId: item.payingAccountId,
        }));
        await tx.insert(expenseItemsTable).values(insertData);
      }

      // 7. Update the Expense Header record (total amount based on new items)
      const updatedTotalAmount = validatedItems.reduce(
        (sum, item) => sum + item.itemAmount,
        0
      );

      const [updatedExpenseHeader] = await tx
        .update(expensesTable)
        .set({
          amount: updatedTotalAmount,
          expenseDate: values.expenseDate,
          // Removed payingAccountId from here
          referenceNumber: values.referenceNumber,
          notes: values.notes || null,
          attachments: values.attachments,
          updatedAt: new Date(),
        })
        .where(eq(expensesTable.id, id))
        .returning();

      if (!updatedExpenseHeader) {
        throw new Error("Expense header not found or could not be updated.");
      }

      // 8. Create Adjustment Journal Entry (reversal of old, application of new)
      const journalLines: Array<{
        chartOfAccountId: string;
        debit: number;
        credit: number;
        memo?: string;
      }> = [];

      // Reversal of old entries
      for (const item of currentLineItems) {
        // Credit old expense categories
        const itemCategoryCoAId =
          (await tx
            .select({
              chartOfAccountsId: expenseCategoriesTable.chartOfAccountsId,
            })
            .from(expenseCategoriesTable)
            .where(
              eq(expenseCategoriesTable.id, item.expenseItem.expenseCategoryId)
            )
            .then((res) => res[0]?.chartOfAccountsId)) ??
          throwError(
            `CoA not found for old category ${item.expenseItem.expenseCategoryId}`
          );
        journalLines.push({
          chartOfAccountId: itemCategoryCoAId,
          debit: 0,
          credit: parseFloat(item.expenseItem.itemAmount as any),
          memo: `Reversal: reduce expense for old item ${item.expenseItem.title}`,
        });

        // Debit old paying accounts
        if (item.payingAccount) {
          journalLines.push({
            chartOfAccountId:
              item.payingAccount.chartOfAccountsId ??
              throwError("Old paying account CoA not found."),
            debit: parseFloat(item.expenseItem.itemAmount as any),
            credit: 0,
            memo: `Reversal: restore funds to ${item.payingAccount.name} for old item ${item.expenseItem.title} in expense report ${currentExpenseHeader.referenceNumber}`,
          });
        }
      }

      // New entries
      for (const item of validatedItems) {
        // Debit new expense categories
        journalLines.push({
          chartOfAccountId:
            item.expenseCategoryCoAId ??
            throwError(
              `CoA not found for new category ${item.expenseCategoryId}`
            ),
          debit: item.itemAmount,
          credit: 0,
          memo: `New: record expense for item ${item.title}`,
        });

        // Credit new paying accounts
        const payingAccount = validatedAccountsForItems.find(
          (va) =>
            va.item.id === item.id ||
            (va.item.title === item.title && !va.item.id) // For new items, match by title
        )?.payingAccount;

        if (payingAccount) {
          journalLines.push({
            chartOfAccountId:
              payingAccount.chartOfAccountsId ??
              throwError("New paying account CoA not found."),
            debit: 0,
            credit: item.itemAmount,
            memo: `New: payment from ${payingAccount.name} for item '${item.title}' in expense report ${updatedExpenseHeader.referenceNumber}`,
          });
        }
      }

      await createJournalEntry({
        tx,
        entryDate: new Date(),
        referenceType: JournalEntryReferenceType.ADJUSTMENT,
        referenceId: updatedExpenseHeader.id,
        userId,
        description: `Adjustment for expense: ${updatedExpenseHeader.referenceNumber}`,
        lines: journalLines,
      });

      return updatedExpenseHeader;
    });

    revalidatePath("/expenses");
    revalidatePath("/accounting-and-finance/expenses");
    revalidatePath(`/accounting-and-finance/expenses/edit/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating expense report:", error);
    throw new Error(error.message || "Failed to update expense report.");
  }
};
// --- Soft delete an Expense (to handle multiple line items) ---
export const softDeleteExpense = async (id: string, userId: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const currentExpenseHeader = await tx
        .select({
          id: expensesTable.id,
          referenceNumber: expensesTable.referenceNumber,
          amount: expensesTable.amount, // Still keeping total amount on header for quick access
        })
        .from(expensesTable)
        .where(eq(expensesTable.id, id))
        .then((res: any[]) => res[0]);

      if (!currentExpenseHeader) {
        throw new Error("Expense header not found.");
      }

      const currentLineItemsWithAccounts = await tx
        .select({
          expenseItem: expenseItemsTable,
          payingAccount: accountsTable,
          expenseCategory: expenseCategoriesTable,
        })
        .from(expenseItemsTable)
        .leftJoin(
          accountsTable,
          eq(expenseItemsTable.payingAccountId, accountsTable.id)
        )
        .leftJoin(
          expenseCategoriesTable,
          eq(expenseItemsTable.expenseCategoryId, expenseCategoriesTable.id)
        )
        .where(eq(expenseItemsTable.expenseId, id));

      // 1. Restore amounts to the respective paying accounts for each line item
      for (const itemWithAccount of currentLineItemsWithAccounts) {
        const item = itemWithAccount.expenseItem;
        const payingAccount = itemWithAccount.payingAccount;

        if (!payingAccount) {
          console.warn(
            `Paying account not found for expense item ${item.id}. Data inconsistency.`
          );
          continue; // Skip this item but continue with others
        }

        const restoredBalance =
          parseFloat(payingAccount.currentBalance as any) +
          parseFloat(item.itemAmount as any);
        await tx
          .update(accountsTable)
          .set({
            currentBalance: restoredBalance,
            updatedAt: new Date(),
          })
          .where(eq(accountsTable.id, payingAccount.id));
      }

      // 2. Deactivate the expense header and its line items
      await tx
        .update(expenseItemsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(expenseItemsTable.expenseId, id));
      const [updatedExpenseHeader] = await tx
        .update(expensesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(expensesTable.id, id))
        .returning();

      // 3. Create a reversal journal entry
      const journalLines: Array<{
        chartOfAccountId: string;
        debit: number;
        credit: number;
        memo?: string;
      }> = [];

      for (const itemWithAccount of currentLineItemsWithAccounts) {
        const item = itemWithAccount.expenseItem;
        const payingAccount = itemWithAccount.payingAccount;
        const expenseCategory = itemWithAccount.expenseCategory;

        // Debit paying account (restore funds for this item)
        if (payingAccount?.chartOfAccountsId) {
          journalLines.push({
            chartOfAccountId: payingAccount.chartOfAccountsId,
            debit: parseFloat(item.itemAmount as any),
            credit: 0,
            memo: `Reversal: funds restored to ${payingAccount.name} for item '${item.title}' in expense report ${currentExpenseHeader.referenceNumber}`,
          });
        } else {
          console.warn(
            `Paying account CoA not found for item ${item.id} during reversal JE.`
          );
        }

        // Credit each individual expense category (reduce expenses for this item)
        if (expenseCategory?.chartOfAccountsId) {
          journalLines.push({
            chartOfAccountId: expenseCategory.chartOfAccountsId,
            debit: 0,
            credit: parseFloat(item.itemAmount as any),
            memo: `Reversal: expense reduced for item '${item.title}' (${expenseCategory.name})`,
          });
        } else {
          console.warn(
            `Expense category CoA not found for item ${item.id} during reversal JE.`
          );
        }
      }

      await createJournalEntry({
        tx,
        entryDate: new Date(),
        referenceType: JournalEntryReferenceType.ADJUSTMENT,
        referenceId: updatedExpenseHeader.id,
        userId,
        description: `Reversal of expense: ${updatedExpenseHeader.referenceNumber}`,
        lines: journalLines,
      });

      return updatedExpenseHeader;
    });

    revalidatePath("/expenses");
    revalidatePath("/accounting-and-finance/expenses");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting expense report:", error);
    throw new Error(error.message || "Failed to deactivate expense report.");
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
