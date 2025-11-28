/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import {
  calculateCommissionAmounts,
  calculateTotalPaidForRecipient,
  parseStringify,
} from "../utils";
import { db } from "@/drizzle/db";
import {
  accountsTable,
  commissionRecipientsTable,
  commissionsTable,
  salesTable,
  salesAgentsTable,
  expenseCategoriesTable,
  commissionSalesTable,
  customersTable,
  commissionPayoutsTable,
} from "@/drizzle/schema";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  CommissionFilters,
  CommissionRecipientPayoutFormValues,
  SalesCommissionFormValues,
  CommissionPayoutFilters,
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
        .limit(1)
        .for("update");

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

// create a new commission record
export const createCommission = async ({
  values,
}: {
  values: SalesCommissionFormValues;
}) => {
  try {
    const saleIds = values.commissionSales.map((entry) => entry.saleId);

    // Calculate totals
    let totalAmountReceived = 0;
    let totalAdditions = 0;
    let totalDeductions = 0;
    let totalBaseForCommission = 0;
    let totalGrossCommission = 0;
    let totalWithholdingTaxAmount = 0;
    let totalCommissionPayable = 0;

    for (const entry of values.commissionSales) {
      const {
        baseForCommission,
        grossCommission,
        withholdingTaxAmount,
        totalCommissionPayable: entryTotalCommissionPayable,
      } = calculateCommissionAmounts(
        entry.amountReceived,
        entry.additions || 0,
        entry.deductions || 0,
        entry.commissionRate / 100,
        entry.withholdingTaxRate / 100
      );

      totalAmountReceived += entry.amountReceived;
      totalAdditions += entry.additions || 0;
      totalDeductions += entry.deductions || 0;
      totalBaseForCommission += baseForCommission;
      totalGrossCommission += grossCommission;
      totalWithholdingTaxAmount += withholdingTaxAmount;
      totalCommissionPayable += entryTotalCommissionPayable;
    }

    // ===== NOW START TRANSACTION =====
    const result = await db.transaction(async (tx) => {
      const existingCommissionWithRefNumber =
        await tx.query.commissionsTable.findFirst({
          where: eq(
            commissionsTable.commissionRefNumber,
            values.commissionRefNumber
          ),
        });

      if (existingCommissionWithRefNumber) {
        throw new Error("Commission reference number already exists.");
      }

      // Insert main commission
      const [insertedCommission] = await tx
        .insert(commissionsTable)
        .values({
          commissionRefNumber: values.commissionRefNumber,
          commissionDate: values.commissionDate,
          customerId: values.customerId,
          notes: values.notes || null,
          totalAmountReceived,
          totalAdditions,
          totalDeductions,
          totalBaseForCommission,
          totalGrossCommission,
          totalWithholdingTaxAmount,
          totalCommissionPayable,
          status: CommissionStatus.PendingApproval,
          paymentStatus: CommissionPaymentStatus.Pending,
        })
        .returning();

      if (!insertedCommission) {
        throw new Error("Failed to create main commission record.");
      }

      // Prepare bulk inserts
      const commissionSalesToInsert = values.commissionSales.map((entry) => ({
        commissionId: insertedCommission.id,
        saleId: entry.saleId,
        amountReceived: entry.amountReceived,
        additions: entry.additions || 0,
        deductions: entry.deductions || 0,
        commissionRate: entry.commissionRate,
        withholdingTaxRate: entry.withholdingTaxRate,
        withholdingTaxId: entry.withholdingTaxId || null,
        withholdingTaxAmount: entry.withholdingTaxAmount || 0,
        baseForCommission: entry.baseForCommission || 0,
        grossCommission: entry.grossCommission || 0,
        commissionPayable: entry.totalCommissionPayable || 0,
      }));

      // Single bulk insert for commission sales
      await tx.insert(commissionSalesTable).values(commissionSalesToInsert);

      // Update sales in single query
      await tx
        .update(salesTable)
        .set({ isCommissionApplied: true, updatedAt: new Date() })
        .where(inArray(salesTable.id, saleIds));

      // Prepare and insert recipients
      const commissionRecipientsToInsert = values.recipients.map(
        (recipient) => ({
          commissionId: insertedCommission.id,
          salesAgentId: recipient.salesAgentId,
          amount: recipient.amount,
          paymentStatus: CommissionPaymentStatus.Pending,
          notes: `Consolidated share for agent from commission ${insertedCommission.commissionRefNumber}`,
        })
      );

      await tx
        .insert(commissionRecipientsTable)
        .values(commissionRecipientsToInsert);

      return insertedCommission;
    });

    revalidatePath("/accounting-and-finance/commissions");
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error creating sales commission:", error);
    if (
      error.code === "23505" &&
      error.constraint_name === "commissions_commission_ref_number_unique"
    ) {
      throw new Error(
        "A duplicate commission reference number was detected. Please try again or provide a different reference number."
      );
    }
    throw new Error(error.message || "Failed to create sales commission.");
  }
};

// Function to update a commission record
export const updateCommission = async ({
  id,
  values,
}: {
  id: string;
  values: SalesCommissionFormValues;
}) => {
  try {
    // Fetch current state with all relations (READ-ONLY)
    const currentCommission = await db.query.commissionsTable.findFirst({
      where: eq(commissionsTable.id, id),
      with: {
        customer: true,
        commissionSales: {
          with: {
            sale: true,
            withholdingTax: true,
          },
        },
        recipients: {
          with: {
            salesAgent: true,
          },
        },
      },
    });

    if (!currentCommission) {
      throw new Error("Commission record not found.");
    }

    // Check if commission can be edited (no payments made)
    if (
      currentCommission.paymentStatus === CommissionPaymentStatus.Paid ||
      currentCommission.paymentStatus === CommissionPaymentStatus.Partial ||
      currentCommission.status === CommissionStatus.Processed
    ) {
      throw new Error(
        "Cannot edit a commission that has already been partially or fully paid or processed."
      );
    }

    const allSalesAgentIds = values.recipients.map(
      (entry) => entry.salesAgentId
    );
    const uniqueSalesAgentIds = [...new Set(allSalesAgentIds)];
    const salesAgents = await db.query.salesAgentsTable.findMany({
      where: and(
        inArray(salesAgentsTable.id, uniqueSalesAgentIds),
        eq(salesAgentsTable.isActive, true)
      ),
    });
    if (salesAgents.length !== uniqueSalesAgentIds.length) {
      throw new Error("One or more sales agents not found or inactive.");
    }

    // Calculate aggregated totals based on `values.commissionSales`
    let totalAmountReceived = 0;
    let totalAdditions = 0;
    let totalDeductions = 0;
    let totalBaseForCommission = 0;
    let totalGrossCommission = 0;
    let totalWithholdingTaxAmount = 0;
    let totalCommissionPayable = 0;

    for (const entry of values.commissionSales) {
      const {
        baseForCommission,
        grossCommission,
        withholdingTaxAmount,
        totalCommissionPayable: entryTotalCommissionPayable,
      } = calculateCommissionAmounts(
        entry.amountReceived,
        entry.additions || 0,
        entry.deductions || 0,
        entry.commissionRate / 100,
        entry.withholdingTaxRate / 100
      );

      totalAmountReceived += entry.amountReceived;
      totalAdditions += entry.additions || 0;
      totalDeductions += entry.deductions || 0;
      totalBaseForCommission += baseForCommission;
      totalGrossCommission += grossCommission;
      totalWithholdingTaxAmount += withholdingTaxAmount;
      totalCommissionPayable += entryTotalCommissionPayable;
    }

    // Prepare data structures for transaction
    const currentCsMap = new Map(
      currentCommission.commissionSales.map((cs) => [cs.id, cs])
    );
    const incomingCsIds = new Set(
      values.commissionSales.filter((e) => e.id).map((e) => e.id!)
    );

    const csToDeleteIds = currentCommission.commissionSales
      .filter((cs) => !incomingCsIds.has(cs.id))
      .map((cs) => cs.id);

    const salesToRevertIsCommissionApplied = currentCommission.commissionSales
      .filter((cs) => csToDeleteIds.includes(cs.id))
      .map((cs) => cs.saleId);

    const csToUpdate = values.commissionSales.filter(
      (e) => e.id && currentCsMap.has(e.id)
    );

    const csToInsert = values.commissionSales.filter((e) => !e.id);

    // Prepare  recipients map
    const recipientsMap = new Map<string, number>();
    for (const recipient of values.recipients) {
      recipientsMap.set(recipient.salesAgentId, recipient.amount);
    }

    const currentRecipientsMap = new Map(
      currentCommission.recipients.map((r) => [r.salesAgentId, r])
    );

    const crToDeleteSalesAgentIds = Array.from(
      currentRecipientsMap.keys()
    ).filter((agentId) => !recipientsMap.has(agentId));

    // Validate recipients can be deleted (not paid)
    if (crToDeleteSalesAgentIds.length > 0) {
      const recipientIdsToDelete = currentCommission.recipients
        .filter((r) => crToDeleteSalesAgentIds.includes(r.salesAgentId))
        .map((r) => r.id);

      if (recipientIdsToDelete.length > 0) {
        const paidRecipientsToDelete = currentCommission.recipients.filter(
          (r) =>
            recipientIdsToDelete.includes(r.id) &&
            (r.paymentStatus === CommissionPaymentStatus.Paid ||
              r.paymentStatus === CommissionPaymentStatus.Partial)
        );
        if (paidRecipientsToDelete.length > 0) {
          throw new Error(
            `Cannot remove sales agent(s) [${paidRecipientsToDelete
              .map(
                (r) =>
                  salesAgents.find((sa) => sa.id === r.salesAgentId)?.name ||
                  r.salesAgentId
              )
              .join(
                ", "
              )}] as their commission has already been partially or fully paid.`
          );
        }
      }
    }

    // Validate recipients can be updated (must be pending)
    const incomingRecipientSalesAgentIds = Array.from(recipientsMap.keys());
    for (const salesAgentId of incomingRecipientSalesAgentIds) {
      const currentRecipient = currentRecipientsMap.get(salesAgentId);
      if (
        currentRecipient &&
        currentRecipient.paymentStatus !== CommissionPaymentStatus.Pending
      ) {
        throw new Error(
          `Cannot update sales agent (${
            salesAgents.find((sa) => sa.id === salesAgentId)?.name ||
            salesAgentId
          }) as their commission is not pending.`
        );
      }
    }

    // ===== NOW START TRANSACTION =====
    const result = await db.transaction(async (tx) => {
      // Update main commissions record
      const [updatedCommission] = await tx
        .update(commissionsTable)
        .set({
          commissionDate: values.commissionDate,
          notes: values.notes || null,
          totalAmountReceived,
          totalAdditions,
          totalDeductions,
          totalBaseForCommission,
          totalGrossCommission,
          totalWithholdingTaxAmount,
          totalCommissionPayable,
          status: CommissionStatus.PendingApproval,
          updatedAt: new Date(),
        })
        .where(eq(commissionsTable.id, id))
        .returning();

      if (!updatedCommission) {
        throw new Error("Failed to update main commission record.");
      }

      // Handle commission_sales deletions
      if (csToDeleteIds.length > 0) {
        await tx
          .delete(commissionSalesTable)
          .where(inArray(commissionSalesTable.id, csToDeleteIds));

        // Revert isCommissionApplied for deleted sales
        if (salesToRevertIsCommissionApplied.length > 0) {
          await tx
            .update(salesTable)
            .set({ isCommissionApplied: false, updatedAt: new Date() })
            .where(inArray(salesTable.id, salesToRevertIsCommissionApplied));
        }
      }

      // Update existing commission_sales (batch updates)
      if (csToUpdate.length > 0) {
        await Promise.all(
          csToUpdate.map((entry) => {
            return tx
              .update(commissionSalesTable)
              .set({
                amountReceived: entry.amountReceived,
                additions: entry.additions || 0,
                deductions: entry.deductions || 0,
                commissionRate: entry.commissionRate,
                withholdingTaxRate: entry.withholdingTaxRate,
                withholdingTaxId: entry.withholdingTaxId || null,
                withholdingTaxAmount: entry.withholdingTaxAmount || 0,
                baseForCommission: entry.baseForCommission || 0,
                grossCommission: entry.grossCommission || 0,
                commissionPayable: entry.totalCommissionPayable || 0,
                updatedAt: new Date(),
              })
              .where(eq(commissionSalesTable.id, entry.id!));
          })
        );
      }

      // Insert new commission_sales (bulk insert)
      let newlyInsertedCommissionSales: (typeof commissionSalesTable.$inferSelect)[] =
        [];
      if (csToInsert.length > 0) {
        const insertData = csToInsert.map((entry) => ({
          commissionId: id,
          saleId: entry.saleId,
          amountReceived: entry.amountReceived,
          additions: entry.additions || 0,
          deductions: entry.deductions || 0,
          commissionRate: entry.commissionRate,
          withholdingTaxRate: entry.withholdingTaxRate,
          withholdingTaxId: entry.withholdingTaxId || null,
          withholdingTaxAmount: entry.withholdingTaxAmount || 0,
          baseForCommission: entry.baseForCommission || 0,
          grossCommission: entry.grossCommission || 0,
          commissionPayable: entry.totalCommissionPayable || 0,
        }));
        newlyInsertedCommissionSales = await tx
          .insert(commissionSalesTable)
          .values(insertData)
          .returning();

        // Set isCommissionApplied for newly inserted sales
        const newSalesToMarkCommissioned = newlyInsertedCommissionSales.map(
          (cs) => cs.saleId
        );
        if (newSalesToMarkCommissioned.length > 0) {
          await tx
            .update(salesTable)
            .set({ isCommissionApplied: true, updatedAt: new Date() })
            .where(inArray(salesTable.id, newSalesToMarkCommissioned));
        }
      }

      // Handle commission_recipients deletions
      if (crToDeleteSalesAgentIds.length > 0) {
        const recipientIdsToDelete = currentCommission.recipients
          .filter((r) => crToDeleteSalesAgentIds.includes(r.salesAgentId))
          .map((r) => r.id);

        if (recipientIdsToDelete.length > 0) {
          await tx
            .delete(commissionRecipientsTable)
            .where(inArray(commissionRecipientsTable.id, recipientIdsToDelete));
        }
      }

      // Update or Insert commission_recipients
      const allCurrentAndNewRecipients: (typeof commissionRecipientsTable.$inferSelect)[] =
        [];

      for (const salesAgentId of incomingRecipientSalesAgentIds) {
        const newTotalAmount = recipientsMap.get(salesAgentId)!;
        const currentRecipient = currentRecipientsMap.get(salesAgentId);

        if (currentRecipient) {
          // Update existing
          const [updatedCr] = await tx
            .update(commissionRecipientsTable)
            .set({ amount: newTotalAmount, updatedAt: new Date() })
            .where(eq(commissionRecipientsTable.id, currentRecipient.id))
            .returning();
          if (updatedCr) allCurrentAndNewRecipients.push(updatedCr);
        } else {
          // Insert new
          const [newCr] = await tx
            .insert(commissionRecipientsTable)
            .values({
              commissionId: id,
              salesAgentId: salesAgentId,
              amount: newTotalAmount,
              paymentStatus: CommissionPaymentStatus.Pending,
              notes: `Consolidated share for agent from commission ${updatedCommission.commissionRefNumber}`,
            })
            .returning();
          if (newCr) allCurrentAndNewRecipients.push(newCr);
        }
      }

      return updatedCommission;
    });

    revalidatePath("/accounting-and-finance/commissions");
    revalidatePath(`/accounting-and-finance/commissions/edit/${id}`);
    return parseStringify(result);
  } catch (error: any) {
    console.error("Error updating commission:", error);
    throw new Error(error.message || "Failed to update commission.");
  }
};

// Get single commission by ID with all relations
export const getCommissionById = async (id: string) => {
  try {
    const fetchedCommission = await db.query.commissionsTable.findFirst({
      where: eq(commissionsTable.id, id),
      with: {
        customer: true,
        commissionSales: {
          with: {
            sale: true,
            withholdingTax: true,
          },
        },
        recipients: {
          with: {
            salesAgent: true,
            payouts: {
              with: {
                payingAccount: true,
                expenseCategory: true,
              },
            },
          },
        },
      },
    });
    if (!fetchedCommission) return null;

    const { recipients, commissionSales, customer, ...commission } =
      fetchedCommission;

    const recipientsWithRelations = recipients.map((r) => {
      const paidSoFar = calculateTotalPaidForRecipient(r.payouts);
      const allocatedAmount = parseFloat(r.amount as any);
      const remainingDue = allocatedAmount - paidSoFar;

      const { salesAgent, payouts, ...rest } = r;

      const payoutsWithRelations = payouts.map((p) => {
        const { payingAccount, expenseCategory, ...payout } = p;
        return {
          payout: payout,
          payingAccount: payingAccount,
          expenseCategory: expenseCategory,
        };
      });

      return {
        recipient: rest,
        salesAgent: salesAgent,
        payouts: payoutsWithRelations,
        paidSoFar: paidSoFar,
        remainingDue: remainingDue,
      };
    });

    const commissionSalesWithRelations = commissionSales.map((cs) => {
      const { sale, withholdingTax, ...rest } = cs;
      return {
        commissionSale: rest,
        sale: sale,
        withholdingTax: withholdingTax,
      };
    });

    return parseStringify({
      commission: commission,
      commissionSales: commissionSalesWithRelations,
      recipients: recipientsWithRelations,
      customer: customer,
    });
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
      const currentCommission = await tx.query.commissionsTable.findFirst({
        where: eq(commissionsTable.id, commissionId),
        with: {
          recipients: true,
        },
      });

      if (!currentCommission) throw new Error("Commission not found.");

      if (newStatus === CommissionStatus.Cancelled) {
        const paidRecipients = currentCommission.recipients.filter(
          (r) =>
            r.paymentStatus === CommissionPaymentStatus.Paid ||
            r.paymentStatus === CommissionPaymentStatus.Partial
        );
        if (paidRecipients.length > 0) {
          throw new Error(
            "Cannot cancel commission as some recipients have already been paid. Please reverse individual payouts first."
          );
        }
      }

      const [updatedCommission] = await tx
        .update(commissionsTable)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(commissionsTable.id, commissionId))
        .returning();

      if (!updatedCommission) throw new Error("Commission not found.");

      // Cascade status update to related tables if cancelled
      if (newStatus === CommissionStatus.Cancelled) {
        // Update commission_sales (no direct status, but can be implied inactive or soft-deleted if needed)
        // For simplicity, we'll just set commission_recipients to cancelled.
        // If commission_sales needed a 'status' column, it would be updated here.

        await tx
          .update(commissionRecipientsTable)
          .set({
            paymentStatus: CommissionPaymentStatus.Cancelled,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(commissionRecipientsTable.commissionId, commissionId),
              // Only cancel pending ones, paid/partial would have thrown an error above
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
export const processCommissionPayouts = async (
  values: CommissionRecipientPayoutFormValues,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      const payoutResults = [];

      // Generate payout reference numbers
      const payoutRefNumbers = await generateCommissionPayoutRefNumbers(
        tx,
        values.payouts.length
      );

      // Fetch all unique commissionRecipientIds from the values
      const uniqueRecipientIds = [
        ...new Set(values.payouts.map((p) => p.commissionRecipientId)),
      ];

      // Fetch necessary data for all recipients and accounts in bulk
      const [recipientsData, accountsData, expenseCategoriesData] =
        await Promise.all([
          tx.query.commissionRecipientsTable.findMany({
            where: inArray(commissionRecipientsTable.id, uniqueRecipientIds),
            with: {
              salesAgent: true,
              commission: {
                with: {
                  commissionSales: {
                    with: { sale: true },
                  },
                },
              },
              payouts: true,
            },
          }),
          tx.query.accountsTable.findMany({
            where: and(
              inArray(accountsTable.id, [
                ...new Set(values.payouts.map((p) => p.payingAccountId)),
              ]),
              eq(accountsTable.isActive, true)
            ),
            with: { chartOfAccount: true },
          }),
          tx.query.expenseCategoriesTable.findMany({
            where: and(
              inArray(expenseCategoriesTable.id, [
                ...new Set(values.payouts.map((p) => p.expenseCategoryId)),
              ]),
              eq(expenseCategoriesTable.isActive, true)
            ),
            with: { chartOfAccount: true },
          }),
        ]);

      const recipientsMap = new Map(recipientsData.map((r) => [r.id, r]));
      const accountsMap = new Map(accountsData.map((a) => [a.id, a]));
      const expenseCategoriesMap = new Map(
        expenseCategoriesData.map((ec) => [ec.id, ec])
      );

      // Process each payout entry
      for (let index = 0; index < values.payouts.length; index++) {
        const entry = values.payouts[index];
        const payoutRefNumber = payoutRefNumbers[index];

        const recipient = recipientsMap.get(entry.commissionRecipientId);
        const payingAccount = accountsMap.get(entry.payingAccountId);
        const expenseCategory = expenseCategoriesMap.get(
          entry.expenseCategoryId
        );

        // Validate recipient exists
        if (!recipient) {
          throw new Error(
            `Commission recipient '${entry.commissionRecipientId}' not found.`
          );
        }

        // Validate paying account exists and is active
        if (!payingAccount) {
          throw new Error(
            `Paying account '${entry.payingAccountId}' not found or inactive.`
          );
        }

        // Validate expense category exists and is active
        if (!expenseCategory) {
          throw new Error(
            `Expense category '${entry.expenseCategoryId}' not found or inactive.`
          );
        }

        // Validate paying account is linked to chart of accounts
        if (!payingAccount.chartOfAccountsId) {
          throw new Error(
            `Paying account '${payingAccount.name}' is not linked to a Chart of Account.`
          );
        }

        // Validate expense category is linked to chart of accounts
        if (!expenseCategory.chartOfAccountsId) {
          throw new Error(
            `Expense category '${expenseCategory.name}' is not linked to a Chart of Account.`
          );
        }

        // Validate commission is approved
        if (recipient.commission.status !== CommissionStatus.Approved) {
          throw new Error(
            `Commission '${recipient.commission.commissionRefNumber}' must be approved before paying individual shares.`
          );
        }

        // Calculate amounts
        const commissionAmount = parseFloat(recipient.amount as any);
        const paidSoFar = calculateTotalPaidForRecipient(recipient.payouts);
        const remainingDue = commissionAmount - paidSoFar;

        // Validate amount to pay doesn't exceed remaining due
        if (entry.amountToPay > remainingDue + 0.01) {
          throw new Error(
            `Amount to pay for ${
              recipient.salesAgent.name
            } (${entry.amountToPay.toFixed(
              2
            )}) exceeds their remaining due (${remainingDue.toFixed(2)}).`
          );
        }

        // Validate account has sufficient funds
        const currentAccountBalance = parseFloat(
          payingAccount.currentBalance as any
        );
        if (currentAccountBalance < entry.amountToPay) {
          throw new Error(
            `Insufficient funds in ${payingAccount.name} for payout to ${
              recipient.salesAgent.name
            }. Available: ${currentAccountBalance.toFixed(
              2
            )}, Required: ${entry.amountToPay.toFixed(2)}`
          );
        }

        // Insert new commission payout record
        const [newPayout] = await tx
          .insert(commissionPayoutsTable)
          .values({
            payoutRefNumber,
            commissionRecipientId: recipient.id,
            payingAccountId: entry.payingAccountId,
            expenseCategoryId: entry.expenseCategoryId,
            amount: entry.amountToPay,
            payoutDate: values.payoutDate,
            notes: values.notes || null,
            userId,
          })
          .returning();

        if (!newPayout) {
          throw new Error("Failed to create commission payout record.");
        }

        // Update paying account balance
        const newAccountBalance = currentAccountBalance - entry.amountToPay;
        await tx
          .update(accountsTable)
          .set({ currentBalance: newAccountBalance, updatedAt: new Date() })
          .where(eq(accountsTable.id, payingAccount.id));

        // Calculate new payment status for recipient
        const newPaidSoFar = paidSoFar + entry.amountToPay;
        let newRecipientPaymentStatus: CommissionPaymentStatus;

        if (newPaidSoFar >= commissionAmount - 0.01) {
          newRecipientPaymentStatus = CommissionPaymentStatus.Paid;
        } else if (newPaidSoFar > 0) {
          newRecipientPaymentStatus = CommissionPaymentStatus.Partial;
        } else {
          newRecipientPaymentStatus = CommissionPaymentStatus.Pending;
        }

        // Update recipient payment status
        const [updatedRecipient] = await tx
          .update(commissionRecipientsTable)
          .set({
            paymentStatus: newRecipientPaymentStatus,
            updatedAt: new Date(),
          })
          .where(eq(commissionRecipientsTable.id, recipient.id))
          .returning();

        // Create Journal Entries for General Ledger
        const firstSaleInvoice =
          recipient.commission.commissionSales?.[0]?.sale?.invoiceNumber ||
          "N/A";
        const description = `Commission Payout: ${
          recipient.salesAgent.name
        } - ${payoutRefNumber} (Ref Comm: ${
          recipient.commission.commissionRefNumber
        }, Sale: ${firstSaleInvoice}${
          recipient.commission.commissionSales &&
          recipient.commission.commissionSales.length > 1
            ? " + others"
            : ""
        })`;

        const journalLines = [
          {
            chartOfAccountId: expenseCategory.chartOfAccountsId,
            debit: entry.amountToPay,
            credit: 0,
            memo: `Commission expense for ${recipient.salesAgent.name}`,
          },
          {
            chartOfAccountId: payingAccount.chartOfAccountsId,
            debit: 0,
            credit: entry.amountToPay,
            memo: `Commission payment to ${recipient.salesAgent.name} from ${payingAccount.name}`,
          },
        ];

        await createJournalEntry({
          tx,
          entryDate: values.payoutDate,
          referenceType: JournalEntryReferenceType.COMMISSION_PAYMENT,
          referenceId: newPayout.id,
          userId,
          description: description,
          lines: journalLines,
        });

        // Store result for return
        payoutResults.push({
          payout: newPayout,
          updatedRecipient,
          payingAccount: {
            id: payingAccount.id,
            name: payingAccount.name,
            previousBalance: currentAccountBalance,
            newBalance: newAccountBalance,
          },
        });
      }

      const allCommissionRecipients =
        await tx.query.commissionRecipientsTable.findMany({
          where: and(
            eq(
              commissionRecipientsTable.commissionId,
              recipientsData[0].commissionId
            ),
            eq(commissionRecipientsTable.isActive, true)
          ),
        });

      // Check if all recipients are fully paid
      const allPaid = allCommissionRecipients.every(
        (r) => r.paymentStatus === CommissionPaymentStatus.Paid
      );

      // Check if any recipients have partial payments
      const anyPartial = allCommissionRecipients.some(
        (r) => r.paymentStatus === CommissionPaymentStatus.Partial
      );

      // Check if any recipients have been paid (fully or partially)
      const anyPaid = allCommissionRecipients.some(
        (r) => r.paymentStatus === CommissionPaymentStatus.Paid
      );

      // Determine overall commission payment status
      const currentCommissionPaymentStatus = allPaid
        ? CommissionPaymentStatus.Paid
        : anyPartial || anyPaid
        ? CommissionPaymentStatus.Partial
        : CommissionPaymentStatus.Pending;

      let updatedCommissionStatus = recipientsData[0].commission.status;
      if (currentCommissionPaymentStatus === CommissionPaymentStatus.Paid) {
        updatedCommissionStatus = CommissionStatus.Processed;
      }

      // Update main commission record
      await tx
        .update(commissionsTable)
        .set({
          paymentStatus: currentCommissionPaymentStatus,
          status: updatedCommissionStatus,
          updatedAt: new Date(),
        })
        .where(eq(commissionsTable.id, recipientsData[0].commissionId));

      revalidatePath("/accounting-and-finance/commissions");
      revalidatePath("/accounting-and-finance/accounts");

      return payoutResults;
    });

    return parseStringify(result);
  } catch (error: any) {
    console.error("Error processing multi-recipient payout:", error);
    throw new Error(
      error.message || "Failed to process multi-recipient payout."
    );
  }
};

// Soft delete a main commission record
export const softDeleteCommission = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const commission = await tx.query.commissionsTable.findFirst({
        where: eq(commissionsTable.id, id),
        with: {
          recipients: {
            with: {
              payouts: true,
            },
          },
          commissionSales: {
            columns: { id: true, saleId: true },
          },
        },
      });

      if (!commission) {
        throw new Error("Commission record not found.");
      }

      // Check if ANY recipient has ANY payouts recorded
      const recipientsWithActualPayouts = commission.recipients.filter((r) =>
        r.payouts.some((p) => p.isActive)
      );

      if (recipientsWithActualPayouts.length > 0) {
        throw new Error(
          "Cannot deactivate a commission as some recipients have received payouts. Please reverse individual payouts first."
        );
      }

      // Proceed with soft delete as before, but ensure recipients are also cancelled
      const [updatedCommission] = await tx
        .update(commissionsTable)
        .set({
          isActive: false,
          updatedAt: new Date(),
          status: CommissionStatus.Cancelled,
        })
        .where(eq(commissionsTable.id, id))
        .returning();

      const recipientIds = commission.recipients.map((r) => r.id);
      if (recipientIds.length > 0) {
        await tx
          .update(commissionRecipientsTable)
          .set({
            isActive: false,
            paymentStatus: CommissionPaymentStatus.Cancelled,
            updatedAt: new Date(),
          })
          .where(inArray(commissionRecipientsTable.id, recipientIds));
      }

      const commissionSalesIds = commission.commissionSales.map((cs) => cs.id);
      const salesIdsToRevert = commission.commissionSales.map(
        (cs) => cs.saleId
      );
      if (commissionSalesIds.length > 0) {
        await tx
          .update(commissionSalesTable)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(inArray(commissionSalesTable.id, commissionSalesIds));

        if (salesIdsToRevert.length > 0) {
          await tx
            .update(salesTable)
            .set({ isCommissionApplied: false, updatedAt: new Date() })
            .where(inArray(salesTable.id, salesIdsToRevert));
        }
      }

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
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${commissionRecipientsTable} WHERE ${commissionRecipientsTable.commissionId} = ${commissionsTable.id} AND ${commissionRecipientsTable.salesAgentId} = ${filters.salesAgentId})`
    );
  }

  // If you want to filter by a specific sale ID, it needs to join `commissionSalesTable`
  if (filters.saleId) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${commissionSalesTable} WHERE ${commissionSalesTable.commissionId} = ${commissionsTable.id} AND ${commissionSalesTable.saleId} = ${filters.saleId})`
    );
  }

  if (filters.status) {
    conditions.push(eq(commissionsTable.status, filters.status));
  }
  if (filters.paymentStatus) {
    conditions.push(eq(commissionsTable.paymentStatus, filters.paymentStatus));
  }

  if (filters.customerId) {
    // NEW filter condition
    conditions.push(eq(commissionsTable.customerId, filters.customerId));
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
        customer: customersTable,
      })
      .from(commissionsTable)
      .leftJoin(
        customersTable,
        eq(commissionsTable.customerId, customersTable.id)
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

    const rawCommissions = await query;
    const commissionIds = rawCommissions.map((c) => c.commission.id);

    // Fetch commission_sales for all commissions
    const allCommissionSales =
      commissionIds.length > 0
        ? await db.query.commissionSalesTable.findMany({
            where: inArray(commissionSalesTable.commissionId, commissionIds),
            with: {
              sale: true,
              withholdingTax: true,
            },
          })
        : [];

    const commissionSalesWithRelations = allCommissionSales.map((cs) => {
      const { sale, withholdingTax, ...rest } = cs;
      return {
        commissionSale: rest,
        sale: sale,
        withholdingTax: withholdingTax,
      };
    });

    const commissionSalesMap = new Map<
      string,
      typeof commissionSalesWithRelations
    >();
    commissionSalesWithRelations.forEach((cs) => {
      const key = cs.commissionSale.commissionId;
      if (!commissionSalesMap.has(key)) {
        commissionSalesMap.set(key, []);
      }
      commissionSalesMap.get(key)?.push(cs);
    });

    // Fetch commission_recipients and their payouts
    const allCommissionRecipients =
      commissionIds.length > 0
        ? await db.query.commissionRecipientsTable.findMany({
            where: and(
              inArray(commissionRecipientsTable.commissionId, commissionIds),
              eq(commissionRecipientsTable.isActive, true)
            ),
            with: {
              salesAgent: true,
              payouts: {
                with: {
                  payingAccount: true,
                  expenseCategory: true,
                },
              },
            },
          })
        : [];

    const recipientsWithRelations = allCommissionRecipients.map((r) => {
      const paidSoFar = calculateTotalPaidForRecipient(r.payouts);
      const allocatedAmount = parseFloat(r.amount as any);
      const remainingDue = allocatedAmount - paidSoFar;

      const { salesAgent, payouts, ...rest } = r;

      const payoutsWithRelations = payouts.map((p) => {
        const { payingAccount, expenseCategory, ...payout } = p;
        return {
          payout: payout,
          payingAccount: payingAccount,
          expenseCategory: expenseCategory,
        };
      });

      return {
        recipient: rest,
        salesAgent: salesAgent,
        payouts: payoutsWithRelations,
        paidSoFar: paidSoFar,
        remainingDue: remainingDue,
      };
    });
    const commissionRecipientsMap = new Map<
      string,
      typeof recipientsWithRelations
    >();
    recipientsWithRelations.forEach((cr) => {
      const key = cr.recipient.commissionId;
      if (!commissionRecipientsMap.has(key)) {
        commissionRecipientsMap.set(key, []);
      }
      commissionRecipientsMap.get(key)?.push(cr);
    });

    const commissionsWithRelations = rawCommissions.map((c) => {
      const relatedCommissionSales =
        commissionSalesMap.get(c.commission.id) || [];
      const relatedRecipients =
        commissionRecipientsMap.get(c.commission.id) || [];

      return {
        commission: c.commission,
        customer: c.customer!,
        commissionSales: relatedCommissionSales,
        recipients: relatedRecipients,
      };
    });

    const total = getAll
      ? rawCommissions.length
      : await db
          .select({ count: sql<number>`count(*)` })
          .from(commissionsTable)
          .leftJoin(
            customersTable,
            eq(commissionsTable.customerId, customersTable.id)
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

export const generateCommissionPayoutRefNumber = async (): Promise<string> => {
  try {
    const result = await db.transaction(async (tx) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");

      const lastPayout = await tx
        .select({ payoutRefNumber: commissionPayoutsTable.payoutRefNumber })
        .from(commissionPayoutsTable)
        .where(sql`payout_ref_number LIKE ${`COMM-PAY.${year}/${month}/%`}`)
        .orderBy(desc(commissionPayoutsTable.createdAt))
        .limit(1)
        .for("update");

      let nextSequence = 1;
      if (lastPayout.length > 0) {
        const lastReferenceNumber = lastPayout[0].payoutRefNumber;
        const lastSequence = parseInt(
          lastReferenceNumber.split("/").pop() || "0",
          10
        );
        nextSequence = lastSequence + 1;
      }

      const sequenceNumber = String(nextSequence).padStart(4, "0");

      return `COMM-PAY.${year}/${month}/${sequenceNumber}`;
    });

    return result;
  } catch (error) {
    console.error(
      "Error generating commission payout reference number:",
      error
    );
    throw error;
  }
};

export const generateCommissionPayoutRefNumbers = async (
  tx: any,
  count: number
): Promise<string[]> => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    let startSequence = 1;

    const prefix = `COMM-PAY.${year}/${month}/`;

    const lastPayout = await tx
      .select({ payoutRefNumber: commissionPayoutsTable.payoutRefNumber })
      .from(commissionPayoutsTable)
      .where(
        sql`${commissionPayoutsTable.payoutRefNumber} LIKE ${prefix + "%"}`
      )
      .orderBy(desc(commissionPayoutsTable.payoutRefNumber))
      .limit(1)
      .for("update");

    if (lastPayout.length > 0) {
      const lastReferenceNumber = lastPayout[0].payoutRefNumber;
      const lastSequence = parseInt(
        lastReferenceNumber.split("/").pop() || "0",
        10
      );
      startSequence = lastSequence + 1;
    }

    const refNumbers: string[] = [];
    for (let i = 0; i < count; i++) {
      const sequenceNumber = String(startSequence + i).padStart(4, "0");
      refNumbers.push(`${prefix}${sequenceNumber}`);
    }

    return refNumbers;
  } catch (error) {
    console.error(
      "Error generating commission payout reference numbers:",
      error
    );
    throw error;
  }
};

export const getCommissionPayouts = async (
  page: number = 0,
  limit: number = 10,
  getAll: boolean = false,
  filters?: CommissionPayoutFilters
) => {
  try {
    const conditions = [eq(commissionPayoutsTable.isActive, true)];

    // Build filter conditions

    if (filters?.payoutRefNumber) {
      conditions.push(
        eq(commissionPayoutsTable.payoutRefNumber, filters.payoutRefNumber)
      );
    }
    if (filters?.commissionId) {
      conditions.push(eq(commissionsTable.id, filters.commissionId));
    }
    if (filters?.commissionRecipientId) {
      conditions.push(
        eq(
          commissionPayoutsTable.commissionRecipientId,
          filters.commissionRecipientId
        )
      );
    }
    if (filters?.salesAgentId) {
      conditions.push(eq(salesAgentsTable.id, filters.salesAgentId));
    }
    if (filters?.payingAccountId) {
      conditions.push(
        eq(commissionPayoutsTable.payingAccountId, filters.payingAccountId)
      );
    }
    if (filters?.expenseCategoryId) {
      conditions.push(
        eq(commissionPayoutsTable.expenseCategoryId, filters.expenseCategoryId)
      );
    }
    if (filters?.payoutDate_start) {
      conditions.push(
        gte(
          commissionPayoutsTable.payoutDate,
          new Date(filters.payoutDate_start)
        )
      );
    }
    if (filters?.payoutDate_end) {
      conditions.push(
        lte(commissionPayoutsTable.payoutDate, new Date(filters.payoutDate_end))
      );
    }
    if (filters?.amount_min !== undefined) {
      conditions.push(gte(commissionPayoutsTable.amount, filters.amount_min));
    }
    if (filters?.amount_max !== undefined) {
      conditions.push(lte(commissionPayoutsTable.amount, filters.amount_max));
    }

    // Select with all direct relations and aggregated sales info
    let query = db
      .select({
        payout: commissionPayoutsTable,
        recipient: commissionRecipientsTable,
        salesAgent: salesAgentsTable,
        commission: commissionsTable,
        payingAccount: accountsTable,
        expenseCategory: expenseCategoriesTable,
        // NEW: Aggregated sales invoice numbers
        aggregatedInvoiceNumbers:
          sql<string>`STRING_AGG(${salesTable.invoiceNumber}, ', ' ORDER BY ${salesTable.invoiceNumber} ASC)`.as(
            "invoiceNumbers"
          ),
      })
      .from(commissionPayoutsTable)
      .leftJoin(
        commissionRecipientsTable,
        eq(
          commissionPayoutsTable.commissionRecipientId,
          commissionRecipientsTable.id
        )
      )
      .leftJoin(
        salesAgentsTable,
        eq(commissionRecipientsTable.salesAgentId, salesAgentsTable.id)
      )
      .leftJoin(
        commissionsTable,
        eq(commissionRecipientsTable.commissionId, commissionsTable.id)
      )
      // NEW: Join commissionSales and sales tables
      .leftJoin(
        commissionSalesTable,
        eq(commissionsTable.id, commissionSalesTable.commissionId)
      )
      .leftJoin(salesTable, eq(commissionSalesTable.saleId, salesTable.id))
      .leftJoin(
        accountsTable,
        eq(commissionPayoutsTable.payingAccountId, accountsTable.id)
      )
      .leftJoin(
        expenseCategoriesTable,
        eq(commissionPayoutsTable.expenseCategoryId, expenseCategoriesTable.id)
      )
      .where(and(...conditions))
      .groupBy(
        commissionPayoutsTable.id,
        commissionRecipientsTable.id,
        salesAgentsTable.id,
        commissionsTable.id,
        accountsTable.id,
        expenseCategoriesTable.id
      )
      .orderBy(
        desc(commissionPayoutsTable.payoutDate),
        desc(commissionPayoutsTable.createdAt)
      )
      .$dynamic();

    if (!getAll && limit > 0) {
      query = query.limit(limit).offset(page * limit);
    }

    const fetchedPayouts = await query;

    const totalCountQuery = db
      .select({
        count: sql<number>`count(DISTINCT ${commissionPayoutsTable.id})`,
      })
      .from(commissionPayoutsTable)
      .leftJoin(
        commissionRecipientsTable,
        eq(
          commissionPayoutsTable.commissionRecipientId,
          commissionRecipientsTable.id
        )
      )
      .leftJoin(
        salesAgentsTable,
        eq(commissionRecipientsTable.salesAgentId, salesAgentsTable.id)
      )
      .leftJoin(
        commissionsTable,
        eq(commissionRecipientsTable.commissionId, commissionsTable.id)
      )
      .leftJoin(
        commissionSalesTable,
        eq(commissionsTable.id, commissionSalesTable.commissionId)
      )
      .leftJoin(salesTable, eq(commissionSalesTable.saleId, salesTable.id))
      .leftJoin(
        accountsTable,
        eq(commissionPayoutsTable.payingAccountId, accountsTable.id)
      )
      .leftJoin(
        expenseCategoriesTable,
        eq(commissionPayoutsTable.expenseCategoryId, expenseCategoriesTable.id)
      )
      .where(and(...conditions))
      .then((res) => res[0]?.count || 0);

    const total = getAll ? fetchedPayouts.length : await totalCountQuery;

    const payoutsWithRelations = fetchedPayouts.map((row) => ({
      payout: row.payout,
      commissionRecipient: {
        recipient: row.recipient!,
        salesAgent: row.salesAgent!,
        commission: row.commission!,
      },
      payingAccount: row.payingAccount!,
      expenseCategory: row.expenseCategory!,
      relatedInvoiceNumbers: row.aggregatedInvoiceNumbers || "N/A",
    }));

    return {
      documents: parseStringify(payoutsWithRelations),
      total,
    };
  } catch (error: any) {
    console.error("Error fetching commission payouts:", error);
    throw new Error(error.message || "Failed to fetch commission payouts.");
  }
};
