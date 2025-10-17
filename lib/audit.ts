/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/drizzle/db";
import {
  auditLogsTable,
  usersTable,
  chartOfAccountsTable,
  accountsTable,
  expenseCategoriesTable,
  incomeCategoriesTable,
  accompanyingExpenseTypesTable,
  expensesTable,
  expenseItemsTable,
  paymentsReceivedTable,
  billPaymentsTable,
  billPaymentItemsTable,
  billPaymentAccountsTable,
  billPaymentAccompanyingExpensesTable,
  journalEntriesTable,
  journalEntryLinesTable,
} from "@/drizzle/schema";
import { PgTable } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { JournalEntryReferenceType } from "@/types";

type ActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ADJUSTMENT"
  | "LOGIN"
  | "VIEW";

interface AuditLogOptions {
  actionType: ActionType;
  tableName: string;
  recordId: string | null;
  userId: string | null;
  userName?: string | null;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  notes?: string;
}

// Map table names to Drizzle PgTable objects
const TABLE_MAP: { [key: string]: PgTable } = {
  chart_of_accounts: chartOfAccountsTable,
  accounts: accountsTable,
  expense_categories: expenseCategoriesTable,
  income_categories: incomeCategoriesTable,
  accompanying_expense_types: accompanyingExpenseTypesTable,
  payments_received: paymentsReceivedTable,
  bill_payments: billPaymentsTable,
  bill_payment_items: billPaymentItemsTable,
  bill_payment_accounts: billPaymentAccountsTable,
  bill_payment_accompanying_expenses: billPaymentAccompanyingExpensesTable,
  expenses: expensesTable,
  expense_line_items: expenseItemsTable,
  users: usersTable,
  journal_entries: journalEntriesTable,
  journal_entry_lines: journalEntryLinesTable,
};

/**
 * Logs an audit event to the database.
 * Requires userId and optionally userName to be explicitly passed.
 */
export async function logAudit(
  tx: any, // Drizzle transaction instance
  options: AuditLogOptions
): Promise<void> {
  try {
    // Attempt to infer IP and User-Agent from incoming request headers
    const requestHeaders = await headers();
    const ipAddress =
      requestHeaders.get("x-forwarded-for") ||
      requestHeaders.get("x-real-ip") ||
      "N/A";
    const userAgent = requestHeaders.get("user-agent") || "N/A";

    let finalUserName = options.userName;
    // If userName is not provided, try to fetch it if userId is present
    if (!finalUserName && options.userId) {
      const user = await tx
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, options.userId))
        .then((res: any) => res[0]);
      finalUserName = user?.name || null;
    }

    await tx.insert(auditLogsTable).values({
      userId: options.userId,
      userName: finalUserName,
      actionType: options.actionType,
      tableName: options.tableName,
      recordId: options.recordId,
      oldData: options.oldData,
      newData: options.newData,
      notes: options.notes,
      ipAddress: ipAddress,
      userAgent: userAgent,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("AUDIT LOGGING FAILED:", error);
  }
}

/**
 * A higher-order function (HOF) to wrap server actions for automatic auditing.
 * It now expects the `userId` to be among the arguments passed to the wrapped action.
 *
 * @param actionName The name of the server action.
 * @param primaryTableName The name of the primary Drizzle table being affected.
 * @param callback The original async server action function that takes `tx` and `userId` (or `userId` as a designated argument), followed by `...otherArgs`.
 * @returns A new async function that wraps the original action with transaction and audit logging.
 */
export function withAudit<TArgs extends any[], TResult>(
  actionName: string,
  primaryTableName: string,
  callback: (tx: any, userId: string, ...otherArgs: TArgs) => Promise<TResult>
): (userId: string, ...otherArgs: TArgs) => Promise<TResult> {
  // MODIFIED: Returned function signature
  return async (userId: string, ...otherArgs: TArgs) => {
    // MODIFIED: userId is now the first argument
    return db.transaction(async (tx) => {
      let oldRecord: Record<string, any> | null = null;
      let recordIdForAudit: string | null = null;
      let actionType: ActionType = "CREATE";

      // Determine actionType and fetch old data (assumes ID is in `otherArgs[0]`)
      if (
        actionName.startsWith("update") ||
        actionName.startsWith("softDelete") ||
        actionName.startsWith("delete")
      ) {
        actionType = "CREATE"; // Will be refined
        if (actionName.startsWith("softDelete")) actionType = "DELETE";
        else if (actionName.startsWith("delete"))
          actionType = "DELETE"; // For hard delete
        else if (actionName.startsWith("update")) actionType = "UPDATE";

        const idArg = otherArgs[0] as string; // Assume ID is the first of `otherArgs`
        recordIdForAudit = idArg;

        const targetTable = TABLE_MAP[primaryTableName];
        if (targetTable && recordIdForAudit) {
          oldRecord = await tx
            .select()
            .from(targetTable)
            .where(eq((targetTable as any).id, recordIdForAudit))
            .then((res) => res[0] || null);
        } else if (!targetTable) {
          console.warn(
            `Audit: No table map for '${primaryTableName}' to fetch old data.`
          );
        }
      }

      try {
        // MODIFIED: Pass userId as the second argument to the callback
        const result = await callback(tx, userId, ...otherArgs);

        let newRecord: Record<string, any> | null = null;
        if (actionType === "CREATE") {
          newRecord =
            result && typeof result === "object" && "id" in result
              ? (result as Record<string, any>)
              : null;
          recordIdForAudit = recordIdForAudit || newRecord?.id || null;
        } else if (actionType === "UPDATE") {
          newRecord =
            result && typeof result === "object" && "id" in result
              ? (result as Record<string, any>)
              : null;
          recordIdForAudit = recordIdForAudit || newRecord?.id || null;
        }

        if (recordIdForAudit) {
          await logAudit(tx, {
            actionType,
            tableName: primaryTableName,
            recordId: recordIdForAudit,
            userId: userId, // Pass userId explicitly
            oldData: oldRecord,
            newData: newRecord,
            notes: `Action: ${actionName} on ${primaryTableName} record ${recordIdForAudit}`,
          });
        } else {
          console.warn(
            `Audit: No recordId found for action '${actionName}' on table '${primaryTableName}'. Audit log skipped.`
          );
        }

        return result;
      } catch (error) {
        console.error(
          `AUDIT ACTION FAILED: Action '${actionName}' on table '${primaryTableName}'. Error:`,
          error
        );
        throw error;
      }
    });
  };
}

interface JournalEntryCreateParams {
  tx: any;
  entryDate: Date;
  referenceType: JournalEntryReferenceType;
  referenceId: string | null;
  userId: string | null;
  description: string;
  lines: Array<{
    chartOfAccountId: string;
    debit: number;
    credit: number;
    memo?: string;
  }>;
}

export async function createJournalEntry(params: JournalEntryCreateParams) {
  const {
    tx,
    entryDate,
    referenceType,
    referenceId,
    userId,
    description,
    lines,
  } = params;

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(
      `Journal entry is unbalanced: Debits (${totalDebit.toFixed(
        2
      )}) do not equal Credits (${totalCredit.toFixed(2)})`
    );
  }

  const [newJournalEntry] = await tx
    .insert(journalEntriesTable)
    .values({
      entryDate,
      referenceType: referenceType,
      referenceId,
      description,
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      userId,
    })
    .returning();

  const journalEntryLines = lines.map((line) => ({
    journalEntryId: newJournalEntry.id,
    chartOfAccountsId: line.chartOfAccountId,
    debit: line.debit.toFixed(2),
    credit: line.credit.toFixed(2),
    description: line.memo,
  }));

  if (journalEntryLines.length > 0) {
    await tx.insert(journalEntryLinesTable).values(journalEntryLines);
  }

  return newJournalEntry;
}

// The createJournalEntryPublic function will now correctly use the updated createJournalEntry
// and receive userId from its wrapper.
export const createJournalEntryPublic = withAudit(
  "createJournalEntryPublic",
  "journal_entries",
  async (
    tx,
    userId: string,
    entryDate: Date,
    referenceType: JournalEntryReferenceType,
    referenceId: string | null,
    description: string,
    lines: Array<{
      chartOfAccountId: string;
      debit: number;
      credit: number;
      memo?: string;
    }>
  ) => {
    return await createJournalEntry({
      tx,
      entryDate,
      referenceType,
      referenceId,
      userId,
      description,
      lines,
    });
  }
);
