/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { calculateCommissionAmounts, parseStringify } from "../utils";
import { db } from "@/drizzle/db";
import {
  accountsTable,
  commissionRecipientsTable,
  commissionsTable,
  salesTable,
  salesAgentsTable,
  taxRatesTable,
  expenseCategoriesTable,
} from "@/drizzle/schema";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  CommissionFilters,
  CommissionRecipientPayoutFormValues,
  SalesCommissionFormValues,
} from "@/lib/validation";
import {
  CommissionPaymentStatus,
  CommissionStatus,
  JournalEntryReferenceType,
} from "@/types";
import { createJournalEntry } from "./accounting.actions";

// Generate reference number
export const generateCommissionRefNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastCommission = await tx
        .select({ commissionRefNumber: commissionsTable.commissionRefNumber })
        .from(commissionsTable)
        .where(sql`commission_ref_number LIKE ${`COMM.${year}/${month}/%`}`)
        .orderBy(desc(commissionsTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastCommission.length > 0) {
        const lastReferenceNumber = lastCommission[0].commissionRefNumber;
        const lastSequence = parseInt(
          lastReferenceNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `COMM.${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error("Error generating commission reference number:", error);
    throw error;
  }
};

// Function to create a new commission record with all its recipients
export const createCommission = async (values: SalesCommissionFormValues) => {
  try {
    const result = await db.transaction(async (tx) => {
      // --- Initial Validations (unchanged, good to keep upfront) ---

      // Validate all sales exist upfront
      const saleIds = values.saleEntries.map((entry) => entry.saleId);
      const sales = await tx.query.salesTable.findMany({
        where: inArray(salesTable.id, saleIds),
      });

      if (sales.length !== saleIds.length) {
        throw new Error("One or more sales not found.");
      }

      const salesMap = new Map(sales.map((s) => [s.id, s]));

      // Validate all withholding tax IDs exist upfront (if any)
      const whtIds = values.saleEntries
        .map((entry) => entry.withholdingTaxId)
        .filter((id): id is string => id != null);

      if (whtIds.length > 0) {
        const uniqueWhtIds = [...new Set(whtIds)];
        const whtTaxes = await tx.query.taxRatesTable.findMany({
          where: and(
            inArray(taxRatesTable.id, uniqueWhtIds),
            eq(taxRatesTable.isActive, true)
          ),
        });

        if (whtTaxes.length !== uniqueWhtIds.length) {
          throw new Error(
            "One or more withholding tax records not found or inactive."
          );
        }
      }

      // Collect and validate all sales agents upfront
      const allSalesAgentIds = values.saleEntries.flatMap((entry) =>
        entry.recipients.map((r) => r.salesAgentId)
      );
      const uniqueSalesAgentIds = [...new Set(allSalesAgentIds)];

      const salesAgents = await tx.query.salesAgentsTable.findMany({
        where: and(
          inArray(salesAgentsTable.id, uniqueSalesAgentIds),
          eq(salesAgentsTable.isActive, true)
        ),
      });

      if (salesAgents.length !== uniqueSalesAgentIds.length) {
        throw new Error("One or more sales agents not found or inactive.");
      }

      // --- Reference Number Generation (THE CRUCIAL CHANGE) ---

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      // Fetch the last reference number ONCE
      const lastCommission = await tx
        .select({ commissionRefNumber: commissionsTable.commissionRefNumber })
        .from(commissionsTable)
        .where(sql`commission_ref_number LIKE ${`COMM.${year}/${month}/%`}`)
        .orderBy(desc(commissionsTable.createdAt))
        .limit(1);

      let nextSequence = 1;
      if (lastCommission.length > 0) {
        const lastReferenceNumber = lastCommission[0].commissionRefNumber;
        const lastSequence = parseInt(
          lastReferenceNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      // --- Process each sale entry ---
      const commissionsToInsert = [];
      const allRecipientsToInsert = [];

      for (const entry of values.saleEntries) {
        // Verify sale exists (should always pass due to earlier validation)
        if (!salesMap.has(entry.saleId)) {
          throw new Error(`Sale ${entry.saleId} not found.`);
        }

        // Perform calculations
        const {
          baseForCommission,
          grossCommission,
          withholdingTaxAmount,
          totalCommissionPayable,
        } = calculateCommissionAmounts(
          entry.amountReceived,
          entry.additions || 0,
          entry.deductions || 0,
          entry.commissionRate / 100,
          entry.withholdingTaxRate / 100
        );

        // Validate recipients total
        const totalRecipientsAmount = entry.recipients.reduce(
          (sum, r) => sum + r.amount,
          0
        );

        if (totalRecipientsAmount > totalCommissionPayable + 0.001) {
          throw new Error(
            `Total distributed to agents (${totalRecipientsAmount.toFixed(
              2
            )}) exceeds total commission payable (${totalCommissionPayable.toFixed(
              2
            )}) for sale ${entry.saleId}`
          );
        }

        // Generate unique commission reference number for this entry
        // Use the manually incremented sequence
        const sequenceNumber = String(nextSequence).padStart(4, "0");
        const commissionRefNumber = `COMM.${year}/${month}/${sequenceNumber}`;

        // Prepare commission data
        commissionsToInsert.push({
          commissionRefNumber,
          commissionDate: values.commissionDate,
          saleId: entry.saleId,
          amountReceived: entry.amountReceived,
          additions: entry.additions || 0,
          deductions: entry.deductions || 0,
          commissionRate: entry.commissionRate,
          withholdingTaxRate: entry.withholdingTaxRate,
          withholdingTaxId: entry.withholdingTaxId || null,
          baseForCommission,
          grossCommission,
          withholdingTaxAmount,
          totalCommissionPayable,
          status: CommissionStatus.PendingApproval,
          notes: values.notes || null,
        });

        // Increment for the *next* entry
        nextSequence++;
      }

      // Batch insert all commissions
      const insertedCommissions = await tx
        .insert(commissionsTable)
        .values(commissionsToInsert)
        .returning();

      if (insertedCommissions.length !== commissionsToInsert.length) {
        throw new Error("Failed to create all commission records.");
      }

      // Prepare all recipients for batch insert
      for (let i = 0; i < values.saleEntries.length; i++) {
        const entry = values.saleEntries[i];
        const commission = insertedCommissions[i];

        for (const recipient of entry.recipients) {
          allRecipientsToInsert.push({
            commissionId: commission.id,
            salesAgentId: recipient.salesAgentId,
            amount: recipient.amount,
            paymentStatus: CommissionPaymentStatus.Pending,
            payingAccountId: null, // As per your schema, this might be optional or set later
            notes: `Share of commission for ${commission.commissionRefNumber}`,
          });
        }
      }

      // Batch insert all recipients
      if (allRecipientsToInsert.length > 0) {
        await tx
          .insert(commissionRecipientsTable)
          .values(allRecipientsToInsert);
      }

      return parseStringify(insertedCommissions);
    });

    revalidatePath("/accounting-and-finance/commissions");
    return result;
  } catch (error: any) {
    console.error("Error creating sales commissions:", error);
    // Be more specific if the error is a PostgresError
    if (
      error.code === "23505" &&
      error.constraint_name === "commissions_commission_ref_number_unique"
    ) {
      throw new Error(
        "A duplicate commission reference number was detected. Please try again (this is usually an automatic retry issue)."
      );
    }
    throw new Error(error.message || "Failed to create sales commissions.");
  }
};

// Function to update a commission record
export const updateCommission = async (
  id: string,
  values: SalesCommissionFormValues
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // Fetch the existing commission with all recipients
      const currentCommission = await tx.query.commissionsTable.findFirst({
        where: eq(commissionsTable.id, id),
        with: {
          recipients: true,
        },
      });

      if (!currentCommission) {
        throw new Error("Commission record not found.");
      }

      // Check if commission can be edited
      if (
        currentCommission.paymentStatus === CommissionPaymentStatus.Paid ||
        currentCommission.paymentStatus === CommissionPaymentStatus.Partial
      ) {
        throw new Error(
          "Cannot edit a commission that has already been partially or fully paid."
        );
      }

      // Validate that we only have ONE sale entry for edit mode
      if (values.saleEntries.length !== 1) {
        throw new Error(
          "Edit mode expects exactly one sale entry. Multiple entries found."
        );
      }

      const entry = values.saleEntries[0];

      // Validate the sale exists
      const sale = await tx.query.salesTable.findFirst({
        where: eq(salesTable.id, entry.saleId),
      });

      if (!sale) {
        throw new Error("Related sale not found.");
      }

      // Validate withholding tax if provided
      if (entry.withholdingTaxId) {
        const whtTax = await tx.query.taxRatesTable.findFirst({
          where: and(
            eq(taxRatesTable.id, entry.withholdingTaxId),
            eq(taxRatesTable.isActive, true)
          ),
        });

        if (!whtTax) {
          throw new Error("Withholding tax record not found or inactive.");
        }
      }

      // Validate all sales agents
      const salesAgentIds = entry.recipients.map((r) => r.salesAgentId);
      const uniqueSalesAgentIds = [...new Set(salesAgentIds)];

      const salesAgents = await tx.query.salesAgentsTable.findMany({
        where: and(
          inArray(salesAgentsTable.id, uniqueSalesAgentIds),
          eq(salesAgentsTable.isActive, true)
        ),
      });

      if (salesAgents.length !== uniqueSalesAgentIds.length) {
        throw new Error("One or more sales agents not found or inactive.");
      }

      // Perform calculations
      const {
        baseForCommission,
        grossCommission,
        withholdingTaxAmount,
        totalCommissionPayable,
      } = calculateCommissionAmounts(
        entry.amountReceived,
        entry.additions || 0,
        entry.deductions || 0,
        entry.commissionRate / 100,
        entry.withholdingTaxRate / 100
      );

      // Validate recipients total
      const totalRecipientsAmount = entry.recipients.reduce(
        (sum, r) => sum + r.amount,
        0
      );

      if (totalRecipientsAmount > totalCommissionPayable + 0.001) {
        throw new Error(
          `Total distributed to agents (${totalRecipientsAmount.toFixed(
            2
          )}) exceeds total commission payable (${totalCommissionPayable.toFixed(
            2
          )})`
        );
      }

      // Update the main commission record
      const [updatedCommission] = await tx
        .update(commissionsTable)
        .set({
          commissionDate: values.commissionDate,
          saleId: entry.saleId,
          amountReceived: entry.amountReceived,
          additions: entry.additions || 0,
          deductions: entry.deductions || 0,
          commissionRate: entry.commissionRate,
          withholdingTaxRate: entry.withholdingTaxRate,
          withholdingTaxId: entry.withholdingTaxId || null,
          baseForCommission,
          grossCommission,
          withholdingTaxAmount,
          totalCommissionPayable,
          notes: values.notes || null,
          status: CommissionStatus.PendingApproval,
          updatedAt: new Date(),
        })
        .where(eq(commissionsTable.id, id))
        .returning();

      if (!updatedCommission) {
        throw new Error("Failed to update commission record.");
      }

      // Manage recipients - Determine what to add, update, and delete
      const currentRecipientIds = new Set(
        currentCommission.recipients.map((r) => r.id)
      );
      const newRecipientIds = new Set(
        entry.recipients.filter((r) => r.id).map((r) => r.id!)
      );

      // Recipients to delete (exist in current but not in new)
      const recipientsToDelete = currentCommission.recipients.filter(
        (r) => !newRecipientIds.has(r.id)
      );

      // Check if any recipient to be deleted has been paid
      for (const recipient of recipientsToDelete) {
        if (recipient.paymentStatus !== CommissionPaymentStatus.Pending) {
          throw new Error(
            `Cannot remove recipient (${recipient.salesAgentId}) as their payment status is not pending.`
          );
        }
      }

      // Delete recipients that are no longer in the form
      if (recipientsToDelete.length > 0) {
        await tx.delete(commissionRecipientsTable).where(
          inArray(
            commissionRecipientsTable.id,
            recipientsToDelete.map((r) => r.id)
          )
        );
      }

      // Recipients to update (exist in both current and new with same ID)
      const recipientsToUpdate = entry.recipients.filter(
        (r) => r.id && currentRecipientIds.has(r.id)
      );

      // Check if any recipient to be updated has been paid
      for (const recipient of recipientsToUpdate) {
        const existingRecipient = currentCommission.recipients.find(
          (r) => r.id === recipient.id
        );

        if (
          existingRecipient &&
          existingRecipient.paymentStatus !== CommissionPaymentStatus.Pending
        ) {
          throw new Error(
            `Cannot update recipient (${existingRecipient.salesAgentId}) as their payment status is not pending.`
          );
        }
      }

      // Batch update existing recipients
      if (recipientsToUpdate.length > 0) {
        await Promise.all(
          recipientsToUpdate.map((r) =>
            tx
              .update(commissionRecipientsTable)
              .set({
                salesAgentId: r.salesAgentId,
                amount: r.amount,
                updatedAt: new Date(),
              })
              .where(eq(commissionRecipientsTable.id, r.id!))
          )
        );
      }

      // Recipients to create (don't have an ID)
      const recipientsToCreate = entry.recipients.filter((r) => !r.id);

      if (recipientsToCreate.length > 0) {
        const insertData = recipientsToCreate.map((r) => ({
          commissionId: id,
          salesAgentId: r.salesAgentId,
          amount: r.amount,
          paymentStatus: CommissionPaymentStatus.Pending,
          payingAccountId: null,
          notes: `Share of commission for ${updatedCommission.commissionRefNumber}`,
        }));

        await tx.insert(commissionRecipientsTable).values(insertData);
      }

      revalidatePath("/accounting-and-finance/commissions");
      revalidatePath(`/accounting-and-finance/commissions/edit/${id}`);
      return parseStringify(updatedCommission);
    });

    return result;
  } catch (error: any) {
    console.error("Error updating commission:", error);
    throw new Error(error.message || "Failed to update commission.");
  }
};

// Get single commission by ID with all relations
export const getCommissionById = async (id: string) => {
  try {
    const commission = await db.query.commissionsTable.findFirst({
      where: eq(commissionsTable.id, id),
      with: {
        sale: true,
        withholdingTax: true,
        recipients: {
          with: {
            salesAgent: true,
            payingAccount: true,
          },
        },
      },
    });
    if (!commission) return null;
    return parseStringify(commission);
  } catch (error: any) {
    console.error("Error fetching commission by ID:", error);
    throw new Error(error.message || "Failed to fetch commission by ID.");
  }
};

// Function to update main commission status (e.g., from pending_approval to approved)
export const updateCommissionStatus = async (
  commissionId: string,
  newStatus: CommissionStatus
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const [updatedCommission] = await tx
        .update(commissionsTable)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(commissionsTable.id, commissionId))
        .returning();

      if (!updatedCommission) throw new Error("Commission not found.");

      if (newStatus === CommissionStatus.Cancelled) {
        const paidRecipients =
          await tx.query.commissionRecipientsTable.findFirst({
            where: and(
              eq(commissionRecipientsTable.commissionId, commissionId),
              eq(
                commissionRecipientsTable.paymentStatus,
                CommissionPaymentStatus.Paid
              )
            ),
          });
        if (paidRecipients) {
          throw new Error(
            "Cannot cancel commission as some recipients have already been paid. Please reverse individual payouts first."
          );
        }

        await tx
          .update(commissionRecipientsTable)
          .set({
            paymentStatus: CommissionPaymentStatus.Cancelled,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(commissionRecipientsTable.commissionId, commissionId),
              eq(
                commissionRecipientsTable.paymentStatus,
                CommissionPaymentStatus.Pending
              )
            )
          );
        console.warn(
          `Commission ${updatedCommission.commissionRefNumber} and its pending recipient shares were cancelled.`
        );
      }

      revalidatePath("/accounting-and-finance/commissions");
      return parseStringify(updatedCommission);
    });
    return result;
  } catch (error: any) {
    console.error("Error updating commission status:", error);
    throw new Error(error.message || "Failed to update commission status.");
  }
};

// Function to pay out an individual recipient's commission share
export const payoutCommissionRecipient = async (
  recipientId: string,
  values: CommissionRecipientPayoutFormValues,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Fetch recipient with all necessary relations in one query
      const recipient = await tx.query.commissionRecipientsTable.findFirst({
        where: eq(commissionRecipientsTable.id, recipientId),
        with: {
          commission: {
            with: {
              sale: true,
            },
          },
          salesAgent: true,
          payingAccount: true,
        },
      });

      if (!recipient) {
        throw new Error("Commission recipient record not found.");
      }

      // 2. Validate recipient payment status
      if (recipient.paymentStatus === CommissionPaymentStatus.Paid) {
        throw new Error("This commission share has already been paid.");
      }

      if (recipient.paymentStatus === CommissionPaymentStatus.Cancelled) {
        throw new Error("Cannot pay a cancelled commission share.");
      }

      // 3. Validate main commission status
      if (recipient.commission.status !== CommissionStatus.Approved) {
        throw new Error(
          "The main commission must be approved before paying individual shares."
        );
      }

      // 4. Validate and fetch paying account
      const payingAccount = await tx.query.accountsTable.findFirst({
        where: and(
          eq(accountsTable.id, values.payingAccountId),
          eq(accountsTable.isActive, true)
        ),
        with: {
          chartOfAccount: true,
        },
      });

      if (!payingAccount) {
        throw new Error("Paying account not found or is inactive.");
      }

      if (!payingAccount.chartOfAccountsId) {
        throw new Error(
          `Paying account ${payingAccount.name} is not linked to a chart of accounts.`
        );
      }

      // 5. Validate expense category
      const expenseCategory = await tx.query.expenseCategoriesTable.findFirst({
        where: and(
          eq(expenseCategoriesTable.id, values.expenseCategoryId),
          eq(expenseCategoriesTable.isActive, true)
        ),
        with: {
          chartOfAccount: true,
        },
      });

      if (!expenseCategory) {
        throw new Error("Expense category not found or is inactive.");
      }

      if (!expenseCategory.chartOfAccountsId) {
        throw new Error(
          `Expense category ${expenseCategory.name} is not linked to a chart of accounts.`
        );
      }

      // 6. Calculate and validate amounts
      const commissionAmount = parseFloat(recipient.amount as any);
      const amountToPay = values.amountToPay;

      // Validate amount to pay
      if (amountToPay <= 0) {
        throw new Error("Amount to pay must be greater than zero.");
      }

      if (amountToPay > commissionAmount) {
        throw new Error(
          `Amount to pay (${amountToPay.toFixed(
            2
          )}) cannot exceed the recipient's commission amount (${commissionAmount.toFixed(
            2
          )}).`
        );
      }

      // 7. Validate account balance
      const currentAccountBalance = parseFloat(
        payingAccount.currentBalance as any
      );

      if (currentAccountBalance < amountToPay) {
        throw new Error(
          `Insufficient funds in ${
            payingAccount.name
          }. Available: ${currentAccountBalance.toFixed(
            2
          )}, Required: ${amountToPay.toFixed(2)}`
        );
      }

      // 8. Update paying account balance
      const newAccountBalance = currentAccountBalance - amountToPay;
      await tx
        .update(accountsTable)
        .set({
          currentBalance: newAccountBalance,
          updatedAt: new Date(),
        })
        .where(eq(accountsTable.id, payingAccount.id));

      // 9. Update recipient record
      const [updatedRecipient] = await tx
        .update(commissionRecipientsTable)
        .set({
          paymentStatus: CommissionPaymentStatus.Paid,
          paidDate: values.paidDate,
          payingAccountId: values.payingAccountId,
          notes: values.notes || recipient.notes,
          updatedAt: new Date(),
        })
        .where(eq(commissionRecipientsTable.id, recipientId))
        .returning();

      if (!updatedRecipient) {
        throw new Error("Failed to update recipient payment status.");
      }

      // 10. Check if all recipients for this commission are now paid
      const allRecipients = await tx.query.commissionRecipientsTable.findMany({
        where: and(
          eq(commissionRecipientsTable.commissionId, recipient.commissionId),
          eq(commissionRecipientsTable.isActive, true)
        ),
      });

      const allPaid = allRecipients.every(
        (r) => r.paymentStatus === CommissionPaymentStatus.Paid
      );
      const anyPaid = allRecipients.some(
        (r) => r.paymentStatus === CommissionPaymentStatus.Paid
      );

      // 11. Update main commission payment status
      if (allPaid) {
        await tx
          .update(commissionsTable)
          .set({
            paymentStatus: CommissionPaymentStatus.Paid,
            status: CommissionStatus.Processed,
            updatedAt: new Date(),
          })
          .where(eq(commissionsTable.id, recipient.commissionId));
      } else if (anyPaid) {
        await tx
          .update(commissionsTable)
          .set({
            paymentStatus: CommissionPaymentStatus.Partial,
            updatedAt: new Date(),
          })
          .where(eq(commissionsTable.id, recipient.commissionId));
      }

      // 12. Create Journal Entries for General Ledger
      const journalLines = [
        // Debit: Commission Expense Account
        {
          chartOfAccountId: expenseCategory.chartOfAccountsId,
          debit: amountToPay,
          credit: 0,
          memo: `Commission expense for ${recipient.salesAgent.name} - ${recipient.commission.commissionRefNumber}`,
        },
        // Credit: Paying Account (Cash/Bank)
        {
          chartOfAccountId: payingAccount.chartOfAccountsId,
          debit: 0,
          credit: amountToPay,
          memo: `Commission payment to ${recipient.salesAgent.name} from ${payingAccount.name}`,
        },
      ];

      // Create the journal entry
      await createJournalEntry({
        tx,
        entryDate: values.paidDate,
        referenceType: JournalEntryReferenceType.COMMISSION_PAYMENT,
        referenceId: recipientId,
        userId,
        description: `Commission Payment: ${recipient.salesAgent.name} - ${recipient.commission.commissionRefNumber} (Invoice: ${recipient.commission.sale.invoiceNumber})`,
        lines: journalLines,
      });

      // 13. Revalidate relevant paths
      revalidatePath("/accounting-and-finance/commissions");
      revalidatePath("/accounting-and-finance/accounts");
      revalidatePath("/accounting-and-finance/general-ledger");

      return parseStringify({
        recipient: updatedRecipient,
        commission: recipient.commission,
        payingAccount: {
          id: payingAccount.id,
          name: payingAccount.name,
          previousBalance: currentAccountBalance,
          newBalance: newAccountBalance,
        },
      });
    });

    return result;
  } catch (error: any) {
    console.error("Error processing commission payout:", error);
    throw new Error(
      error.message || "Failed to process commission recipient payout."
    );
  }
};

// Soft delete a main commission record (unchanged except error message for salesAgentId)
export const softDeleteCommission = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const commission = await tx.query.commissionsTable.findFirst({
        where: eq(commissionsTable.id, id),
      });

      if (!commission) {
        throw new Error("Commission record not found.");
      }

      const paidRecipients = await tx.query.commissionRecipientsTable.findFirst(
        {
          where: and(
            eq(commissionRecipientsTable.commissionId, id),
            eq(
              commissionRecipientsTable.paymentStatus,
              CommissionPaymentStatus.Paid
            )
          ),
        }
      );
      if (paidRecipients) {
        throw new Error(
          "Cannot deactivate a commission as some recipients have already been paid. Please reverse individual payouts first."
        );
      }

      const [updatedCommission] = await tx
        .update(commissionsTable)
        .set({
          isActive: false,
          updatedAt: new Date(),
          status: CommissionStatus.Cancelled,
        })
        .where(eq(commissionsTable.id, id))
        .returning();

      await tx
        .update(commissionRecipientsTable)
        .set({
          isActive: false,
          paymentStatus: CommissionPaymentStatus.Cancelled,
          updatedAt: new Date(),
        })
        .where(eq(commissionRecipientsTable.commissionId, id));

      revalidatePath("/accounting-and-finance/commissions");
      return parseStringify(updatedCommission);
    });

    return result;
  } catch (error: any) {
    console.error("Error soft deleting commission:", error);
    throw new Error(error.message || "Failed to deactivate commission.");
  }
};

const buildCommissionFilterConditions = (filters: CommissionFilters) => {
  const conditions = [eq(commissionsTable.isActive, true)];

  if (filters.salesAgentId) {
    // Changed to salesAgentId
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${commissionRecipientsTable} WHERE ${commissionRecipientsTable.commissionId} = ${commissionsTable.id} AND ${commissionRecipientsTable.salesAgentId} = ${filters.salesAgentId})`
    );
  }

  if (filters.saleId) {
    conditions.push(eq(commissionsTable.saleId, filters.saleId));
  }
  if (filters.status) {
    conditions.push(eq(commissionsTable.status, filters.status));
  }
  if (filters.paymentStatus) {
    conditions.push(eq(commissionsTable.paymentStatus, filters.paymentStatus));
  }

  if (filters.commissionDate_start) {
    conditions.push(
      gte(
        commissionsTable.commissionDate,
        new Date(filters.commissionDate_start)
      )
    );
  }
  if (filters.commissionDate_end) {
    conditions.push(
      lte(commissionsTable.commissionDate, new Date(filters.commissionDate_end))
    );
  }

  if (filters.amount_min !== undefined) {
    conditions.push(
      gte(commissionsTable.totalCommissionPayable, filters.amount_min)
    );
  }
  if (filters.amount_max !== undefined) {
    conditions.push(
      lte(commissionsTable.totalCommissionPayable, filters.amount_max)
    );
  }

  return conditions;
};

export const getCommissions = async (
  page: number = 0,
  limit: number = 10,
  getAll: boolean = false,
  filters?: CommissionFilters
) => {
  try {
    const conditions = buildCommissionFilterConditions(filters ?? {});

    let query = db
      .select({
        commission: commissionsTable,
        sale: salesTable,
        withholdingTax: taxRatesTable,
      })
      .from(commissionsTable)
      .leftJoin(salesTable, eq(commissionsTable.saleId, salesTable.id))
      .leftJoin(
        taxRatesTable,
        eq(commissionsTable.withholdingTaxId, taxRatesTable.id)
      )
      .where(and(...conditions))
      .orderBy(
        desc(commissionsTable.commissionDate),
        desc(commissionsTable.createdAt)
      )
      .$dynamic();

    if (!getAll && limit > 0) {
      query = query.limit(limit).offset(page * limit);
    }

    const commissions = await query;

    const commissionIds = commissions.map((c) => c.commission.id);
    const recipients =
      commissionIds.length > 0
        ? await db.query.commissionRecipientsTable.findMany({
            where: and(
              inArray(commissionRecipientsTable.commissionId, commissionIds),
              eq(commissionRecipientsTable.isActive, true)
            ),
            with: {
              salesAgent: true,
              payingAccount: true,
            },
          })
        : [];

    const commissionsWithRelations = commissions.map((c) => ({
      ...c,
      recipients: recipients
        .filter((r) => r.commissionId === c.commission.id)
        .map((r) => ({
          recipient: r,
          salesAgent: r.salesAgent,
          payingAccount: r.payingAccount,
        })),
    }));

    const total = getAll
      ? commissions.length
      : await db
          .select({ count: sql<number>`count(*)` })
          .from(commissionsTable)
          .leftJoin(salesTable, eq(commissionsTable.saleId, salesTable.id))
          .leftJoin(
            taxRatesTable,
            eq(commissionsTable.withholdingTaxId, taxRatesTable.id)
          )
          .where(and(...conditions))
          .then((res) => res[0]?.count || 0);

    return {
      documents: parseStringify(commissionsWithRelations),
      total,
    };
  } catch (error: any) {
    console.error("Error fetching commissions:", error);
    throw new Error(error.message || "Failed to fetch commissions.");
  }
};
