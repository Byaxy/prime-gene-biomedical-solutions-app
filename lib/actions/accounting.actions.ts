/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import {
  chartOfAccountsTable,
  accountsTable,
  usersTable,
  journalEntriesTable,
  journalEntryLinesTable,
  expensesTable,
  billPaymentAccountsTable,
  paymentsReceivedTable,
} from "@/drizzle/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { parseStringify } from "@/lib/utils";
import {
  AccountType,
  ChartOfAccountType,
  ChartOfAccountWithRelations,
  JournalEntryReferenceType,
} from "@/types";
import {
  AccountFilters,
  AccountFormValidationRefined,
  AccountFormValues,
  ChartOfAccountFormValidation,
  ChartOfAccountFormValues,
} from "../validation";

// --- Utility Function: Create Journal Entry (Internal) ---
// This function is crucial for maintaining double-entry accounting.
// It will be called by other server actions (e.g., addExpense, recordIncome, payBill)
export async function createJournalEntry(
  tx: any,
  entryDate: Date,
  referenceType: JournalEntryReferenceType,
  referenceId: string | null,
  userId: string,
  description: string,
  lines: Array<{
    chartOfAccountId: string;
    debit: number;
    credit: number;
    memo?: string;
  }>
) {
  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Journal entry is unbalanced: Debits (${totalDebit}) do not equal Credits (${totalCredit})`
    );
  }

  const [newJournalEntry] = await tx
    .insert(journalEntriesTable)
    .values({
      entryDate,
      referenceType,
      referenceId,
      description,
      totalDebit,
      totalCredit,
      userId,
    })
    .returning();

  const journalEntryLines = lines.map((line) => ({
    journalEntryId: newJournalEntry.id,
    chartOfAccountsId: line.chartOfAccountId,
    debit: line.debit,
    credit: line.credit,
    description: line.memo, // Use memo for description in line
  }));

  if (journalEntryLines.length > 0) {
    await tx.insert(journalEntryLinesTable).values(journalEntryLines);
  }

  return newJournalEntry;
}

// --- Chart of Accounts CRUD Operations ---

// Add a new Chart of Account
export const addChartOfAccount = async (values: ChartOfAccountFormValues) => {
  const parsedValues = ChartOfAccountFormValidation.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Chart of Account data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Check for unique account number
      const existingAccount = await tx
        .select({ id: chartOfAccountsTable.id })
        .from(chartOfAccountsTable)
        .where(
          eq(chartOfAccountsTable.accountName, parsedValues.data.accountName)
        );
      if (existingAccount.length > 0) {
        throw new Error("Account number already exists.");
      }

      let parentDepth = 0;
      let calculatedPath = parsedValues.data.accountName;

      if (parsedValues.data.parentId) {
        const parentAccount = await tx
          .select({
            depth: chartOfAccountsTable.depth,
            path: chartOfAccountsTable.path,
          })
          .from(chartOfAccountsTable)
          .where(eq(chartOfAccountsTable.id, parsedValues.data.parentId))
          .then((res) => res[0]);

        if (parentAccount) {
          parentDepth = parentAccount.depth ?? 1 + 1;
          calculatedPath = `${parentAccount.path}/${parsedValues.data.accountName}`;
        } else {
          throw new Error("Parent account not found.");
        }
      }

      const [newAccount] = await tx
        .insert(chartOfAccountsTable)
        .values({
          ...parsedValues.data,
          depth: parentDepth,
          path: calculatedPath,
          accountType: parsedValues.data.accountType as ChartOfAccountType,
          parentId: parsedValues.data.parentId && parsedValues.data.parentId,
        })
        .returning();

      return newAccount;
    });

    revalidatePath("/accounting-and-finance/chart-of-account");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating Chart of Account:", error);
    throw new Error(error.message || "Failed to create Chart of Account.");
  }
};

// Get Chart of Accounts
export const getChartOfAccounts = async () => {
  // Removed parentId and filters parameters
  try {
    const accounts = await db.transaction(async (tx) => {
      // Fetch all top-level accounts (those with no parent)
      const rootAccounts = await tx
        .select()
        .from(chartOfAccountsTable)
        .where(
          and(
            eq(chartOfAccountsTable.isActive, true),
            sql`${chartOfAccountsTable.parentId} IS NULL`
          )
        )
        .orderBy(chartOfAccountsTable.createdAt);

      //  Recursive function to fetch children, wrapping them in the desired object structure
      const fetchChildren = async (
        parentAccountId: string
      ): Promise<ChartOfAccountWithRelations[]> => {
        const children = await tx
          .select()
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(chartOfAccountsTable.parentId, parentAccountId),
              eq(chartOfAccountsTable.isActive, true)
            )
          )
          .orderBy(chartOfAccountsTable.createdAt);

        const childrenWithRelations: ChartOfAccountWithRelations[] = [];
        for (const child of children) {
          childrenWithRelations.push({
            account: child,
            children: await fetchChildren(child.id),
          });
        }
        return childrenWithRelations;
      };

      // Build the full hierarchical tree starting from root accounts
      const fullTree: ChartOfAccountWithRelations[] = [];
      for (const account of rootAccounts) {
        fullTree.push({
          account: account,
          children: await fetchChildren(account.id),
        });
      }

      return fullTree;
    });

    return parseStringify(accounts); // Return the full tree structure
  } catch (error: any) {
    console.error("Error fetching Chart of Accounts:", error);
    throw new Error(error.message || "Failed to fetch Chart of Accounts.");
  }
};

// Get a single Chart of Account by ID
export const getChartOfAccountById = async (id: string) => {
  try {
    const account = await db
      .select()
      .from(chartOfAccountsTable)
      .where(
        and(
          eq(chartOfAccountsTable.id, id),
          eq(chartOfAccountsTable.isActive, true)
        )
      )
      .then((res) => res[0]);

    return parseStringify(account);
  } catch (error: any) {
    console.error("Error fetching Chart of Account by ID:", error);
    throw new Error(error.message || "Failed to fetch Chart of Account by ID.");
  }
};

// Update a Chart of Account
export const updateChartOfAccount = async (
  id: string,
  values: Partial<ChartOfAccountFormValues>
) => {
  // Use a partial schema for updates, as not all fields might be provided
  const parsedValues = ChartOfAccountFormValidation.partial().safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Chart of Account data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Check for unique account number if it's being updated
      if (parsedValues.data.accountName) {
        const [existingAccount] = await tx
          .select({
            id: chartOfAccountsTable.id,
            accountName: chartOfAccountsTable.accountName,
          })
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(
                chartOfAccountsTable.accountName,
                parsedValues.data.accountName
              ),
              eq(chartOfAccountsTable.isActive, true),
              eq(chartOfAccountsTable.id, id)
            )
          );
        if (
          existingAccount &&
          existingAccount.accountName.toLocaleLowerCase() !==
            parsedValues.data?.accountName.trim().toLocaleLowerCase()
        ) {
          throw new Error(
            "Account number already exists for another active account."
          );
        }
      }

      // Re-calculate path and depth if parentId or accountNumber changes
      let updatedPath: string | undefined;
      let updatedDepth: number | undefined;

      if (
        parsedValues.data.parentId !== undefined ||
        parsedValues.data.accountName !== undefined
      ) {
        const currentAccount = await tx.query.chartOfAccountsTable.findFirst({
          where: eq(chartOfAccountsTable.id, id),
        });

        const newParentId =
          parsedValues.data.parentId !== undefined
            ? parsedValues.data.parentId
            : currentAccount?.parentId;
        const newAccountName =
          parsedValues.data.accountName !== undefined
            ? parsedValues.data.accountName
            : currentAccount?.accountName;

        if (newParentId) {
          const parentAccount = await tx.query.chartOfAccountsTable.findFirst({
            where: eq(chartOfAccountsTable.id, newParentId),
          });
          if (parentAccount) {
            updatedDepth = (parentAccount.depth || 0) + 1;
            updatedPath = `${parentAccount.path}/${newAccountName}`;
          } else {
            throw new Error("Parent account not found for re-pathing.");
          }
        } else {
          updatedDepth = 0;
          updatedPath = newAccountName;
        }
      }

      const [updatedAccount] = await tx
        .update(chartOfAccountsTable)
        .set({
          ...parsedValues.data,
          accountType: parsedValues.data.accountType as ChartOfAccountType,
          path: updatedPath,
          depth: updatedDepth,
          updatedAt: new Date(),
        })
        .where(eq(chartOfAccountsTable.id, id))
        .returning();

      if (!updatedAccount) {
        throw new Error("Chart of Account not found or could not be updated.");
      }

      return updatedAccount;
    });

    revalidatePath("/accounting-and-finance/chart-of-account");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating Chart of Account:", error);
    throw new Error(error.message || "Failed to update Chart of Account.");
  }
};

// Soft delete a Chart of Account
export const softDeleteChartOfAccount = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if there are any active child accounts
      const activeChildren = await tx
        .select({ id: chartOfAccountsTable.id })
        .from(chartOfAccountsTable)
        .where(
          and(
            eq(chartOfAccountsTable.parentId, id),
            eq(chartOfAccountsTable.isActive, true)
          )
        );
      if (activeChildren.length > 0) {
        throw new Error(
          "Cannot delete account: It has active child accounts. Please deactivate children first."
        );
      }

      // Check if there are any associated active accounts (Bank, Mobile Money, Cash)
      const associatedAccounts = await tx
        .select({ id: accountsTable.id })
        .from(accountsTable)
        .where(
          and(
            eq(accountsTable.chartOfAccountsId, id),
            eq(accountsTable.isActive, true)
          )
        );
      if (associatedAccounts.length > 0) {
        throw new Error(
          "Cannot delete account: It is linked to active financial accounts (Bank, Mobile Money, Cash). Please deactivate them first."
        );
      }

      // Check for any transactions linked to this Chart of Account
      const linkedTransactions = await tx
        .select({ id: journalEntryLinesTable.id })
        .from(journalEntryLinesTable)
        .where(eq(journalEntryLinesTable.chartOfAccountsId, id));

      if (linkedTransactions.length > 0) {
        throw new Error(
          "Cannot delete account: It has historical transactions. Only deactivation is allowed."
        );
      }

      const [updatedAccount] = await tx
        .update(chartOfAccountsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(chartOfAccountsTable.id, id))
        .returning();

      if (!updatedAccount) {
        throw new Error(
          "Chart of Account not found or could not be deactivated."
        );
      }

      return updatedAccount;
    });

    revalidatePath("/accounting-and-finance/chart-of-account");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting Chart of Account:", error);
    throw new Error(error.message || "Failed to deactivate Chart of Account.");
  }
};

// --- Accounts (Bank, Mobile Money, Cash on Hand) CRUD Operations ---

// Add a new Account (Bank, Mobile Money, Cash)
export const addAccount = async (values: AccountFormValues, userId: string) => {
  const parsedValues = AccountFormValidationRefined.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Account data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  const user = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.isActive, true)))
    .then((res) => res[0]);
  if (!user) {
    throw new Error("User not found.");
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Check if a linked CoA exists and is active
      const linkedChartOfAccount = await tx
        .select({
          id: chartOfAccountsTable.id,
          accountType: chartOfAccountsTable.accountType,
        })
        .from(chartOfAccountsTable)
        .where(
          and(
            eq(chartOfAccountsTable.id, parsedValues.data.chartOfAccountsId),
            eq(chartOfAccountsTable.isActive, true)
          )
        );
      if (linkedChartOfAccount.length === 0) {
        throw new Error(
          "Linked Chart of Account not found or is inactive. Please link to an active Asset account type."
        );
      }
      if (linkedChartOfAccount[0].accountType !== "asset") {
        throw new Error(
          "Accounts (Bank, Mobile Money, Cash) must be linked to an 'Asset' type Chart of Account."
        );
      }

      // Check for unique account number if provided (e.g., for Bank/Momo)
      if (
        parsedValues.data.accountNumber &&
        parsedValues.data.accountNumber.trim() !== ""
      ) {
        const existingAccountWithNumber = await tx
          .select({ id: accountsTable.id })
          .from(accountsTable)
          .where(
            eq(accountsTable.accountNumber, parsedValues.data.accountNumber)
          );
        if (existingAccountWithNumber.length > 0) {
          throw new Error("Account number already exists for another account.");
        }
      }

      const [newAccount] = await tx
        .insert(accountsTable)
        .values({
          ...parsedValues.data,
          currentBalance: parsedValues.data.openingBalance,
          bankAddress: parsedValues.data.bankAddress
            ? {
                addressName: parsedValues.data.bankAddress.addressName || "",
                address: parsedValues.data.bankAddress.address || "",
                city: parsedValues.data.bankAddress.city || "",
                state: parsedValues.data.bankAddress.state || "",
                country: parsedValues.data.bankAddress.country || "",
              }
            : null,
        })
        .returning();

      if (!newAccount) {
        throw new Error("Failed to create new account.");
      }

      const defaultEquityAccountId = await tx
        .select({ id: chartOfAccountsTable.id })
        .from(chartOfAccountsTable)
        .where(
          and(
            eq(chartOfAccountsTable.isDefault, true),
            eq(chartOfAccountsTable.accountType, "equity")
          )
        )
        .then((res) => res[0]?.id);

      if (!defaultEquityAccountId) {
        throw new Error(
          "Default Equity Chart of Account not found. Please ensure a Chart of Account is marked as default with 'equity' type."
        );
      }

      // Create initial journal entry for opening balance
      await createJournalEntry(
        tx,
        newAccount.createdAt,
        JournalEntryReferenceType.ADJUSTMENT,
        newAccount.id,
        userId,
        `Opening balance for ${newAccount.name}`,
        [
          {
            chartOfAccountId: parsedValues.data.chartOfAccountsId,
            debit: newAccount.openingBalance,
            credit: 0,
            memo: "Opening Balance",
          },
          {
            // Assuming an initial Equity or Owner's Capital account for contra entry
            // This CoA ID should be pre-configured as a default system account.
            chartOfAccountId: defaultEquityAccountId,
            debit: 0,
            credit: newAccount.openingBalance,
            memo: "Initial Equity/Capital",
          },
        ]
      );

      return newAccount;
    });

    revalidatePath("/accounting-and-finance/banking");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating Account:", error);
    throw new Error(error.message || "Failed to create account.");
  }
};

// Get all Accounts (Bank, Mobile Money, Cash) with pagination and filtering
export const getAccounts = async (
  page: number = 0,
  limit: number = 10,
  getAll: boolean = false,
  filters?: AccountFilters
) => {
  try {
    const result = await db.transaction(async (tx) => {
      let query = tx
        .select({
          account: accountsTable,
          chartOfAccount: chartOfAccountsTable,
        })
        .from(accountsTable)
        .leftJoin(
          chartOfAccountsTable,
          eq(accountsTable.chartOfAccountsId, chartOfAccountsTable.id)
        )
        .where(eq(accountsTable.isActive, true))
        .$dynamic();

      // Build filter conditions
      const conditions = [];
      if (filters?.search) {
        const searchTerm = `%${filters.search.trim()}%`;
        conditions.push(
          or(
            ilike(accountsTable.name, searchTerm),
            ilike(accountsTable.accountNumber, searchTerm),
            ilike(accountsTable.bankName, searchTerm),
            ilike(accountsTable.merchantCode, searchTerm)
          )
        );
      }
      if (filters?.accountType) {
        conditions.push(
          eq(accountsTable.accountType, filters.accountType as AccountType)
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(accountsTable.createdAt));

      let totalCount = 0;
      if (!getAll) {
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(accountsTable)
          .leftJoin(
            chartOfAccountsTable,
            eq(accountsTable.chartOfAccountsId, chartOfAccountsTable.id)
          )
          .where(and(eq(accountsTable.isActive, true), ...conditions));
        totalCount = countResult?.count || 0;

        query = query.limit(limit).offset(page * limit);
      } else {
        const [countResult] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(accountsTable)
          .leftJoin(
            chartOfAccountsTable,
            eq(accountsTable.chartOfAccountsId, chartOfAccountsTable.id)
          )
          .where(and(eq(accountsTable.isActive, true), ...conditions));
        totalCount = countResult?.count || 0;
      }

      const accounts = await query;

      return {
        documents: accounts,
        total: totalCount,
      };
    });

    return {
      documents: parseStringify(result.documents),
      total: result.total,
    };
  } catch (error: any) {
    console.error("Error fetching Accounts:", error);
    throw new Error(error.message || "Failed to fetch accounts.");
  }
};

// Get a single Account by ID
export const getAccountById = async (id: string) => {
  try {
    const account = await db
      .select({
        account: accountsTable,
        chartOfAccount: chartOfAccountsTable,
      })
      .from(accountsTable)
      .leftJoin(
        chartOfAccountsTable,
        eq(accountsTable.chartOfAccountsId, chartOfAccountsTable.id)
      )
      .where(and(eq(accountsTable.id, id), eq(accountsTable.isActive, true)))
      .then((res) => res[0]);

    return parseStringify(account);
  } catch (error: any) {
    console.error("Error fetching Account by ID:", error);
    throw new Error(error.message || "Failed to fetch account by ID.");
  }
};

// Update an Account (Bank, Mobile Money, Cash)
export const updateAccount = async (
  id: string,
  values: Partial<AccountFormValues>
) => {
  // Use the refined schema for validation
  const parsedValues = AccountFormValidationRefined.safeParse(values);
  if (!parsedValues.success) {
    throw new Error(
      "Invalid Account data: " +
        parsedValues.error.errors.map((e) => e.message).join(", ")
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const currentAccount = await tx
        .select()
        .from(accountsTable)
        .where(eq(accountsTable.id, id))
        .then((res) => res[0]);
      if (!currentAccount) {
        throw new Error("Account not found.");
      }

      // Check for unique account number if it's being updated and is not cash_on_hand
      if (
        parsedValues.data.accountNumber !== undefined &&
        parsedValues.data.accountNumber !== null &&
        parsedValues.data.accountNumber.trim() !== "" &&
        (parsedValues.data.accountType || currentAccount.accountType) !==
          "cash_on_hand"
      ) {
        const existingAccountWithNumber = await tx
          .select({ id: accountsTable.id })
          .from(accountsTable)
          .where(
            and(
              eq(accountsTable.accountNumber, parsedValues.data.accountNumber),
              eq(accountsTable.isActive, true),
              sql`${accountsTable.id} != ${id}` // Exclude the current account
            )
          );
        if (existingAccountWithNumber.length > 0) {
          throw new Error(
            "Account number already exists for another active account."
          );
        }
      }

      // Validate linked CoA if it's being updated
      if (parsedValues.data.chartOfAccountsId) {
        const linkedChartOfAccount = await tx
          .select({
            id: chartOfAccountsTable.id,
            accountType: chartOfAccountsTable.accountType,
          })
          .from(chartOfAccountsTable)
          .where(
            and(
              eq(chartOfAccountsTable.id, parsedValues.data.chartOfAccountsId),
              eq(chartOfAccountsTable.isActive, true)
            )
          );
        if (linkedChartOfAccount.length === 0) {
          throw new Error(
            "Linked Chart of Account not found or is inactive. Please link to an active Asset account type."
          );
        }
        if (linkedChartOfAccount[0].accountType !== "asset") {
          throw new Error(
            "Accounts (Bank, Mobile Money, Cash) must be linked to an 'Asset' type Chart of Account."
          );
        }
      }

      // Handle scenario where account type changes to 'cash_on_hand'
      if (parsedValues.data.accountType === "cash_on_hand") {
        parsedValues.data.bankName = null;
        parsedValues.data.swiftCode = null;
        parsedValues.data.merchantCode = null;
        parsedValues.data.bankAddress = undefined;
      } else if (currentAccount.accountType === "cash_on_hand") {
        // If changing from cash_on_hand to other type, ensure required fields are present
        if (
          parsedValues.data.accountType === "bank" &&
          (!parsedValues.data.bankName || !parsedValues.data.accountNumber)
        ) {
          throw new Error(
            "Bank name and account number are required when changing to bank account type."
          );
        }
        if (
          parsedValues.data.accountType === "mobile_money" &&
          !parsedValues.data.accountNumber
        ) {
          throw new Error(
            "Account number is required when changing to mobile money account type."
          );
        }
      }

      const [updatedAccount] = await tx
        .update(accountsTable)
        .set({
          ...parsedValues.data,
          bankAddress: parsedValues.data.bankAddress
            ? {
                addressName: parsedValues.data.bankAddress.addressName || "",
                address: parsedValues.data.bankAddress.address || "",
                city: parsedValues.data.bankAddress.city || "",
                state: parsedValues.data.bankAddress.state || "",
                country: parsedValues.data.bankAddress.country || "",
              }
            : null,
          updatedAt: new Date(),
        })
        .where(eq(accountsTable.id, id))
        .returning();

      if (!updatedAccount) {
        throw new Error("Account not found or could not be updated.");
      }

      return updatedAccount;
    });

    revalidatePath("/accounting-and-finance/banking");
    revalidatePath(`/accounting-and-finance/banking/${id}`);
    // Consider revalidating paths for expenses/income that might display account balances
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating Account:", error);
    throw new Error(error.message || "Failed to update account.");
  }
};

// Soft delete an Account
export const softDeleteAccount = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if there are any active transactions (journal entry lines) linked to this account
      // This is crucial. If there are, it implies financial activity that shouldn't be simply removed.
      const linkedJournalEntries = await tx
        .select({ id: journalEntryLinesTable.id })
        .from(journalEntryLinesTable)
        .leftJoin(
          chartOfAccountsTable,
          eq(journalEntryLinesTable.chartOfAccountsId, chartOfAccountsTable.id)
        )
        .leftJoin(
          accountsTable,
          eq(chartOfAccountsTable.id, accountsTable.chartOfAccountsId)
        )
        .where(eq(accountsTable.id, id));

      if (linkedJournalEntries.length > 0) {
        throw new Error(
          "Cannot delete account: It has historical financial transactions. Only deactivation is allowed to preserve audit trail."
        );
      }

      // Check for related expenses, income payments, bill payments directly linked
      // This is a more direct check for records referencing this account as source/destination
      const linkedExpenses = await tx
        .select({ id: expensesTable.id })
        .from(expensesTable)
        .where(eq(expensesTable.payingAccountId, id));
      const linkedPaymentsReceived = await tx
        .select({ id: paymentsReceivedTable.id })
        .from(paymentsReceivedTable)
        .where(eq(paymentsReceivedTable.receivingAccountId, id));
      const linkedBillPayments = await tx
        .select({ id: billPaymentAccountsTable.id })
        .from(billPaymentAccountsTable)
        .where(eq(billPaymentAccountsTable.payingAccountId, id));

      if (
        linkedExpenses.length > 0 ||
        linkedPaymentsReceived.length > 0 ||
        linkedBillPayments.length > 0
      ) {
        throw new Error(
          "Cannot delete account: It is linked to existing expenses, income records, or bill payments. Only deactivation is allowed."
        );
      }

      const [updatedAccount] = await tx
        .update(accountsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(accountsTable.id, id))
        .returning();

      if (!updatedAccount) {
        throw new Error("Account not found or could not be deactivated.");
      }

      return updatedAccount;
    });

    revalidatePath("/accounting-and-finance/banking");
    revalidatePath(`/accounting-and-finance/banking/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error soft deleting Account:", error);
    throw new Error(error.message || "Failed to deactivate account.");
  }
};

// Expose internal utility if needed by other modules directly (e.g., from Sales or Purchases)
// Though it's generally better for these modules to call their own 'recordPayment' or 'payBill' actions
// which then internally use createJournalEntry.
export const createJournalEntryPublic = async (
  entryDate: Date,
  referenceType: JournalEntryReferenceType,
  referenceId: string | null,
  userId: string,
  description: string,
  lines: Array<{
    chartOfAccountId: string;
    debit: number;
    credit: number;
    memo?: string;
  }>
) => {
  try {
    const newEntry = await db.transaction(async (tx) => {
      return await createJournalEntry(
        tx,
        entryDate,
        referenceType,
        referenceId,
        userId,
        description,
        lines
      );
    });
    return parseStringify(newEntry);
  } catch (error: any) {
    console.error("Error creating public journal entry:", error);
    throw new Error(error.message || "Failed to create journal entry.");
  }
};
