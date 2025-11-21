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
  commissionSalesTable,
  commissionRecipientSalesTable,
  customersTable,
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
    // Validate customer
    const customer = await db.query.customersTable.findFirst({
      where: and(
        eq(customersTable.id, values.customerId),
        eq(customersTable.isActive, true)
      ),
    });
    if (!customer) {
      throw new Error("Customer not found or inactive.");
    }

    // Validate sales
    const saleIds = values.saleEntries.map((entry) => entry.saleId);
    const sales = await db.query.salesTable.findMany({
      where: and(
        inArray(salesTable.id, saleIds),
        eq(salesTable.customerId, values.customerId),
        eq(salesTable.paymentStatus, "paid"),
        eq(salesTable.isActive, true)
      ),
    });

    if (sales.length !== saleIds.length) {
      throw new Error(
        "One or more sales not found, unpaid, or do not belong to the selected customer."
      );
    }
    const salesMap = new Map(sales.map((s) => [s.id, s]));

    // Check for existing commissions
    const existingCommissionSales =
      await db.query.commissionSalesTable.findMany({
        where: and(
          inArray(commissionSalesTable.saleId, saleIds),
          eq(commissionSalesTable.isActive, true)
        ),
      });

    if (existingCommissionSales.length > 0) {
      const commissionedSaleNumbers = existingCommissionSales
        .map((cs) => salesMap.get(cs.saleId)?.invoiceNumber)
        .join(", ");
      throw new Error(
        `One or more sales (${commissionedSaleNumbers}) are already part of a commission.`
      );
    }

    // Validate withholding tax
    const whtIds = values.saleEntries
      .map((entry) => entry.withholdingTaxId)
      .filter((id): id is string => id != null);
    if (whtIds.length > 0) {
      const uniqueWhtIds = [...new Set(whtIds)];
      const whtTaxes = await db.query.taxRatesTable.findMany({
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

    // Validate sales agents
    const allSalesAgentIds = values.saleEntries.flatMap((entry) =>
      entry.recipients.map((r) => r.salesAgentId)
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

    // Calculate totals BEFORE transaction
    let totalAmountReceived = 0;
    let totalAdditions = 0;
    let totalDeductions = 0;
    let totalBaseForCommission = 0;
    let totalGrossCommission = 0;
    let totalWithholdingTaxAmount = 0;
    let totalCommissionPayable = 0;

    for (const entry of values.saleEntries) {
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

      const totalRecipientsAmount = entry.recipients.reduce(
        (sum, r) => sum + r.amount,
        0
      );
      if (
        Math.abs(totalRecipientsAmount - entryTotalCommissionPayable) > 0.01
      ) {
        throw new Error(
          `Total distributed to agents (${totalRecipientsAmount.toFixed(
            2
          )}) does not exactly match commission payable (${entryTotalCommissionPayable.toFixed(
            2
          )}) for sale ${salesMap.get(entry.saleId)?.invoiceNumber}.`
        );
      }
    }

    // Prepare data structures
    const overallRecipientsMap = new Map<string, number>();
    values.saleEntries.forEach((entry) => {
      entry.recipients.forEach((r) => {
        overallRecipientsMap.set(
          r.salesAgentId,
          (overallRecipientsMap.get(r.salesAgentId) || 0) + r.amount
        );
      });
    });

    // ===== NOW START TRANSACTION =====
    const result = await db.transaction(async (tx) => {
      // Check reference number uniqueness in transaction (with lock)
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
      const commissionSalesToInsert = values.saleEntries.map((entry) => ({
        commissionId: insertedCommission.id,
        saleId: entry.saleId,
        amountReceived: entry.amountReceived,
        additions: entry.additions || 0,
        deductions: entry.deductions || 0,
        commissionRate: entry.commissionRate,
        withholdingTaxRate: entry.withholdingTaxRate,
        withholdingTaxId: entry.withholdingTaxId || null,
      }));

      // Single bulk insert for commission sales
      const insertedCommissionSales = await tx
        .insert(commissionSalesTable)
        .values(commissionSalesToInsert)
        .returning();

      // Update sales in single query
      await tx
        .update(salesTable)
        .set({ isCommissionApplied: true, updatedAt: new Date() })
        .where(inArray(salesTable.id, saleIds));

      // Prepare and insert recipients
      const commissionRecipientsToInsert = Array.from(
        overallRecipientsMap.entries()
      ).map(([salesAgentId, totalAmount]) => ({
        commissionId: insertedCommission.id,
        salesAgentId: salesAgentId,
        amount: totalAmount,
        paymentStatus: CommissionPaymentStatus.Pending,
        notes: `Consolidated share for agent from commission ${insertedCommission.commissionRefNumber}`,
      }));

      const insertedCommissionRecipients = await tx
        .insert(commissionRecipientsTable)
        .values(commissionRecipientsToInsert)
        .returning();

      const commissionSalesMap = new Map(
        insertedCommissionSales.map((cs) => [cs.saleId, cs])
      );
      const commissionRecipientsMap = new Map(
        insertedCommissionRecipients.map((cr) => [cr.salesAgentId, cr])
      );

      // Prepare granular recipient sales
      const commissionRecipientSalesToInsert = [];
      for (const entry of values.saleEntries) {
        const commissionSale = commissionSalesMap.get(entry.saleId);
        if (!commissionSale) continue;

        for (const recipientEntry of entry.recipients) {
          const commissionRecipient = commissionRecipientsMap.get(
            recipientEntry.salesAgentId
          );
          if (!commissionRecipient) continue;

          commissionRecipientSalesToInsert.push({
            commissionRecipientId: commissionRecipient.id,
            commissionSalesId: commissionSale.id,
            amount: recipientEntry.amount,
          });
        }
      }

      // Single bulk insert for recipient sales
      if (commissionRecipientSalesToInsert.length > 0) {
        await tx
          .insert(commissionRecipientSalesTable)
          .values(commissionRecipientSalesToInsert);
      }

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
    // 1. Fetch current state with all relations (READ-ONLY)
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
            recipientSales: true,
          },
        },
      },
    });

    if (!currentCommission) {
      throw new Error("Commission record not found.");
    }

    // 2. Check if commission can be edited (no payments made)
    if (
      currentCommission.paymentStatus === CommissionPaymentStatus.Paid ||
      currentCommission.paymentStatus === CommissionPaymentStatus.Partial ||
      currentCommission.status === CommissionStatus.Processed
    ) {
      throw new Error(
        "Cannot edit a commission that has already been partially or fully paid or processed."
      );
    }

    // 3. Validate customer
    const customer = await db.query.customersTable.findFirst({
      where: and(
        eq(customersTable.id, values.customerId),
        eq(customersTable.isActive, true)
      ),
    });
    if (!customer) {
      throw new Error("Customer not found or inactive.");
    }
    if (currentCommission.customerId !== values.customerId) {
      throw new Error("Cannot change customer for an existing commission.");
    }

    // 4. Identify new sales being added
    const incomingSaleIds = values.saleEntries.map((entry) => entry.saleId);
    const currentCommissionSaleIds = currentCommission.commissionSales.map(
      (cs) => cs.saleId
    );
    const newSaleIds = incomingSaleIds.filter(
      (saleId) => !currentCommissionSaleIds.includes(saleId)
    );

    // 5. Validate new sales that are being added
    if (newSaleIds.length > 0) {
      const newSales = await db.query.salesTable.findMany({
        where: and(
          inArray(salesTable.id, newSaleIds),
          eq(salesTable.customerId, values.customerId),
          eq(salesTable.paymentStatus, "paid"),
          eq(salesTable.isActive, true)
        ),
      });
      if (newSales.length !== newSaleIds.length) {
        throw new Error(
          "One or more new sales not found, unpaid, or do not belong to the selected customer."
        );
      }

      // Check if any new sales are already commissioned elsewhere
      const existingCommissionSalesForNewIds =
        await db.query.commissionSalesTable.findMany({
          where: and(
            inArray(commissionSalesTable.saleId, newSaleIds),
            eq(commissionSalesTable.isActive, true)
          ),
        });
      if (existingCommissionSalesForNewIds.length > 0) {
        const alreadyCommissionedSaleNumbers = existingCommissionSalesForNewIds
          .map((cs) => newSales.find((s) => s.id === cs.saleId)?.invoiceNumber)
          .join(", ");
        throw new Error(
          `One or more new sales (${alreadyCommissionedSaleNumbers}) are already part of a different commission.`
        );
      }
    }

    // 6. Fetch all sales data
    const allUniqueSaleIdsInRequest = [...new Set(incomingSaleIds)];
    const sales = await db.query.salesTable.findMany({
      where: and(
        inArray(salesTable.id, allUniqueSaleIdsInRequest),
        eq(salesTable.isActive, true)
      ),
    });
    const salesMap = new Map(sales.map((s) => [s.id, s]));

    // 7. Validate withholding tax records
    const whtIds = values.saleEntries
      .map((entry) => entry.withholdingTaxId)
      .filter((id): id is string => id != null);
    if (whtIds.length > 0) {
      const uniqueWhtIds = [...new Set(whtIds)];
      const whtTaxes = await db.query.taxRatesTable.findMany({
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

    // 8. Validate sales agents
    const allSalesAgentIds = values.saleEntries.flatMap((entry) =>
      entry.recipients.map((r) => r.salesAgentId)
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

    // 9. Calculate aggregated totals based on `values.saleEntries`
    let totalAmountReceived = 0;
    let totalAdditions = 0;
    let totalDeductions = 0;
    let totalBaseForCommission = 0;
    let totalGrossCommission = 0;
    let totalWithholdingTaxAmount = 0;
    let totalCommissionPayable = 0;

    for (const entry of values.saleEntries) {
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

      const totalRecipientsAmount = entry.recipients.reduce(
        (sum, r) => sum + r.amount,
        0
      );
      if (
        Math.abs(totalRecipientsAmount - entryTotalCommissionPayable) > 0.01
      ) {
        throw new Error(
          `Total distributed to agents (${totalRecipientsAmount.toFixed(
            2
          )}) does not exactly match commission payable (${entryTotalCommissionPayable.toFixed(
            2
          )}) for sale ${salesMap.get(entry.saleId)?.invoiceNumber}.`
        );
      }
    }

    // 10. Prepare data structures for transaction
    const currentCsMap = new Map(
      currentCommission.commissionSales.map((cs) => [cs.id, cs])
    );
    const incomingCsIds = new Set(
      values.saleEntries.filter((e) => e.id).map((e) => e.id!)
    );

    const csToDeleteIds = currentCommission.commissionSales
      .filter((cs) => !incomingCsIds.has(cs.id))
      .map((cs) => cs.id);

    const salesToRevertIsCommissionApplied = currentCommission.commissionSales
      .filter((cs) => csToDeleteIds.includes(cs.id))
      .map((cs) => cs.saleId);

    const csToUpdate = values.saleEntries.filter(
      (e) => e.id && currentCsMap.has(e.id)
    );

    const csToInsert = values.saleEntries.filter((e) => !e.id);

    // 11. Prepare overall recipients map
    const overallRecipientsMap = new Map<string, number>();
    values.saleEntries.forEach((entry) => {
      entry.recipients.forEach((r) => {
        overallRecipientsMap.set(
          r.salesAgentId,
          (overallRecipientsMap.get(r.salesAgentId) || 0) + r.amount
        );
      });
    });

    const currentRecipientsMap = new Map(
      currentCommission.recipients.map((r) => [r.salesAgentId, r])
    );

    const crToDeleteSalesAgentIds = Array.from(
      currentRecipientsMap.keys()
    ).filter((agentId) => !overallRecipientsMap.has(agentId));

    // 12. Validate recipients can be deleted (not paid)
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

    // 13. Validate recipients can be updated (must be pending)
    const incomingRecipientSalesAgentIds = Array.from(
      overallRecipientsMap.keys()
    );
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
        const recipientsToCascadeDelete =
          await tx.query.commissionRecipientSalesTable.findMany({
            where: and(
              inArray(
                commissionRecipientSalesTable.commissionSalesId,
                csToDeleteIds
              ),
              eq(commissionRecipientSalesTable.isActive, true)
            ),
          });
        if (recipientsToCascadeDelete.length > 0) {
          await tx.delete(commissionRecipientSalesTable).where(
            inArray(
              commissionRecipientSalesTable.id,
              recipientsToCascadeDelete.map((r) => r.id)
            )
          );
        }
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

      // Build map of all commission_sales in this update
      const updatedAndNewCommissionSales = [
        ...csToUpdate.map((e) => ({ id: e.id!, saleId: e.saleId })),
        ...newlyInsertedCommissionSales.map((e) => ({
          id: e.id,
          saleId: e.saleId,
        })),
      ];
      const allCommissionSalesInThisUpdate = new Map(
        updatedAndNewCommissionSales.map((cs) => [cs.saleId, cs.id])
      );

      // Handle commission_recipients deletions
      if (crToDeleteSalesAgentIds.length > 0) {
        const recipientIdsToDelete = currentCommission.recipients
          .filter((r) => crToDeleteSalesAgentIds.includes(r.salesAgentId))
          .map((r) => r.id);

        if (recipientIdsToDelete.length > 0) {
          // Delete associated granular entries first
          await tx
            .delete(commissionRecipientSalesTable)
            .where(
              inArray(
                commissionRecipientSalesTable.commissionRecipientId,
                recipientIdsToDelete
              )
            );
          await tx
            .delete(commissionRecipientsTable)
            .where(inArray(commissionRecipientsTable.id, recipientIdsToDelete));
        }
      }

      // Update or Insert commission_recipients
      const allCurrentAndNewRecipients: (typeof commissionRecipientsTable.$inferSelect)[] =
        [];

      for (const salesAgentId of incomingRecipientSalesAgentIds) {
        const newTotalAmount = overallRecipientsMap.get(salesAgentId)!;
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

      const allRecipientsMap = new Map(
        allCurrentAndNewRecipients.map((cr) => [cr.salesAgentId, cr])
      );

      // Manage commission_recipient_sales (granular allocations)
      const currentCrsMap = new Map<
        string,
        typeof commissionRecipientSalesTable.$inferSelect
      >();
      currentCommission.recipients.forEach((r) => {
        r.recipientSales.forEach((crs) => {
          const agentId = allRecipientsMap.get(r.salesAgentId)?.id;
          if (agentId) {
            currentCrsMap.set(`${agentId}-${crs.commissionSalesId}`, crs);
          }
        });
      });

      const crsBatchToInsert = [];
      const crsBatchToUpdate = [];
      const incomingCrsKeys = new Set<string>();

      for (const entry of values.saleEntries) {
        const commissionSaleId = allCommissionSalesInThisUpdate.get(
          entry.saleId
        );
        if (!commissionSaleId) continue;

        for (const recipientEntry of entry.recipients) {
          const commissionRecipient = allRecipientsMap.get(
            recipientEntry.salesAgentId
          );
          if (!commissionRecipient) continue;

          const currentCrsKey = `${commissionRecipient.id}-${commissionSaleId}`;
          incomingCrsKeys.add(currentCrsKey);

          const existingCrs = currentCrsMap.get(currentCrsKey);

          if (existingCrs) {
            // Update existing granular allocation
            if (Math.abs(existingCrs.amount - recipientEntry.amount) > 0.01) {
              crsBatchToUpdate.push(
                tx
                  .update(commissionRecipientSalesTable)
                  .set({ amount: recipientEntry.amount, updatedAt: new Date() })
                  .where(eq(commissionRecipientSalesTable.id, existingCrs.id))
              );
            }
          } else {
            // Insert new granular allocation
            crsBatchToInsert.push({
              commissionRecipientId: commissionRecipient.id,
              commissionSalesId: commissionSaleId,
              amount: recipientEntry.amount,
            });
          }
        }
      }

      // Identify granular allocations to delete
      const crsToDeleteIds: string[] = [];
      for (const [key, crs] of currentCrsMap.entries()) {
        if (!incomingCrsKeys.has(key)) {
          crsToDeleteIds.push(crs.id);
        }
      }

      // Execute granular allocation changes
      if (crsToDeleteIds.length > 0) {
        await tx
          .delete(commissionRecipientSalesTable)
          .where(inArray(commissionRecipientSalesTable.id, crsToDeleteIds));
      }
      if (crsBatchToInsert.length > 0) {
        await tx.insert(commissionRecipientSalesTable).values(crsBatchToInsert);
      }
      if (crsBatchToUpdate.length > 0) {
        await Promise.all(crsBatchToUpdate);
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
    const commission = await db.query.commissionsTable.findFirst({
      where: eq(commissionsTable.id, id),
      with: {
        customer: true,

        // Fetch commission_sales (do not request an unknown nested 'recipients' property here)
        commissionSales: {
          with: {
            sale: true,
            withholdingTax: true,
          },
        },
        // Fetch overall commission recipients (summaries for each agent)
        recipients: {
          with: {
            salesAgent: true,
            payingAccount: true, // For payout info
          },
        },
      },
    });
    if (!commission) return null;

    // The data mapping logic from backend to frontend for `CommissionWithRelations`
    // will need to be careful, as `CommissionWithRelations` now expects a flat list of `recipients`
    // where `recipients.recipient.id` is the `commission_recipients` ID.
    // The `mapInitialDataToFormValues` on the frontend will handle this transformation.

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
export const payoutCommissionRecipient = async (
  recipientId: string,
  values: CommissionRecipientPayoutFormValues,
  userId: string
) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Fetch recipient with all necessary relations
      const recipient = await tx.query.commissionRecipientsTable.findFirst({
        where: eq(commissionRecipientsTable.id, recipientId),
        with: {
          commission: {
            with: {
              // Now we need to fetch commission_sales to get sale invoice number
              commissionSales: {
                with: {
                  sale: true,
                },
              },
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

      // 4. Validate and fetch paying account & expense category
      const payingAccount = await tx.query.accountsTable.findFirst({
        where: and(
          eq(accountsTable.id, values.payingAccountId),
          eq(accountsTable.isActive, true)
        ),
        with: { chartOfAccount: true },
      });
      if (!payingAccount?.chartOfAccountsId) {
        throw new Error(
          "Paying account not found, inactive, or not linked to COA."
        );
      }

      const expenseCategory = await tx.query.expenseCategoriesTable.findFirst({
        where: and(
          eq(expenseCategoriesTable.id, values.expenseCategoryId),
          eq(expenseCategoriesTable.isActive, true)
        ),
        with: { chartOfAccount: true },
      });
      if (!expenseCategory?.chartOfAccountsId) {
        throw new Error(
          "Expense category not found, inactive, or not linked to COA."
        );
      }

      // 5. Calculate and validate amounts
      const commissionAmount = parseFloat(recipient.amount as any);
      const amountToPay = values.amountToPay;
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

      // Validate account balance
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

      // Update paying account balance
      const newAccountBalance = currentAccountBalance - amountToPay;
      await tx
        .update(accountsTable)
        .set({ currentBalance: newAccountBalance, updatedAt: new Date() })
        .where(eq(accountsTable.id, payingAccount.id));

      // Update recipient record
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

      // Check and update main commission payment status
      const allRecipientsForCommission =
        await tx.query.commissionRecipientsTable.findMany({
          where: and(
            eq(commissionRecipientsTable.commissionId, recipient.commissionId),
            eq(commissionRecipientsTable.isActive, true)
          ),
        });

      const allPaid = allRecipientsForCommission.every(
        (r) => r.paymentStatus === CommissionPaymentStatus.Paid
      );
      const anyPaid = allRecipientsForCommission.some(
        (r) =>
          r.paymentStatus === CommissionPaymentStatus.Paid ||
          r.paymentStatus === CommissionPaymentStatus.Partial
      );

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

      // 10. Create Journal Entries for General Ledger
      // If there are multiple sales, which invoice number do we show?
      // For simplicity, we can pick the first one or indicate 'Multiple Sales'.
      const firstSaleInvoice =
        recipient.commission.commissionSales?.[0]?.sale?.invoiceNumber || "N/A";
      const description = `Commission Payment: ${recipient.salesAgent.name} - ${
        recipient.commission.commissionRefNumber
      } (Sales: ${firstSaleInvoice}${
        recipient.commission.commissionSales.length > 1 ? " + others" : ""
      })`;

      const journalLines = [
        {
          chartOfAccountId: expenseCategory.chartOfAccountsId,
          debit: amountToPay,
          credit: 0,
          memo: `Commission expense for ${recipient.salesAgent.name}`,
        },
        {
          chartOfAccountId: payingAccount.chartOfAccountsId,
          debit: 0,
          credit: amountToPay,
          memo: `Commission payment to ${recipient.salesAgent.name} from ${payingAccount.name}`,
        },
      ];

      await createJournalEntry({
        tx,
        entryDate: values.paidDate,
        referenceType: JournalEntryReferenceType.COMMISSION_PAYMENT,
        referenceId: recipientId,
        userId,
        description: description,
        lines: journalLines,
      });

      // Revalidate relevant paths
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

// Soft delete a main commission record
export const softDeleteCommission = async (id: string) => {
  try {
    const result = await db.transaction(async (tx) => {
      const commission = await tx.query.commissionsTable.findFirst({
        where: eq(commissionsTable.id, id),
        with: {
          recipients: true,
          commissionSales: {
            // Fetch commission_sales to get their IDs
            columns: { id: true, saleId: true },
          },
        },
      });

      if (!commission) {
        throw new Error("Commission record not found.");
      }

      const paidRecipients = commission.recipients.filter(
        (r) =>
          r.paymentStatus === CommissionPaymentStatus.Paid ||
          r.paymentStatus === CommissionPaymentStatus.Partial
      );
      if (paidRecipients.length > 0) {
        throw new Error(
          "Cannot deactivate a commission as some recipients have already been paid. Please reverse individual payouts first."
        );
      }

      // 1. Set main commission to inactive and cancelled
      const [updatedCommission] = await tx
        .update(commissionsTable)
        .set({
          isActive: false,
          updatedAt: new Date(),
          status: CommissionStatus.Cancelled,
        })
        .where(eq(commissionsTable.id, id))
        .returning();

      // 2. Get IDs of all related commission_recipients
      const recipientIds = commission.recipients.map((r) => r.id);

      // 3. Set all associated commission_recipients to inactive and cancelled
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

      // 4. Get IDs of all related commission_sales
      const commissionSalesIds = commission.commissionSales.map((cs) => cs.id);
      const salesIdsToRevert = commission.commissionSales.map(
        (cs) => cs.saleId
      );
      // 5. Set all associated commission_sales to inactive
      if (commissionSalesIds.length > 0) {
        await tx
          .update(commissionSalesTable)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(inArray(commissionSalesTable.id, commissionSalesIds));

        // Revert isCommissionApplied for all sales associated with this commission
        if (salesIdsToRevert.length > 0) {
          await tx
            .update(salesTable)
            .set({ isCommissionApplied: false, updatedAt: new Date() })
            .where(inArray(salesTable.id, salesIdsToRevert));
        }

        // 6. Get IDs of all related commission_recipient_sales
        // (Must query based on commissionSalesIds because commission_recipients are now summaries)
        const commissionRecipientSales =
          await tx.query.commissionRecipientSalesTable.findMany({
            where: inArray(
              commissionRecipientSalesTable.commissionSalesId,
              commissionSalesIds
            ),
            columns: { id: true },
          });
        const crsIds = commissionRecipientSales.map((crs) => crs.id);

        // 7. Set all associated commission_recipient_sales to inactive
        if (crsIds.length > 0) {
          await tx
            .update(commissionRecipientSalesTable)
            .set({
              isActive: false,
              updatedAt: new Date(),
            })
            .where(inArray(commissionRecipientSalesTable.id, crsIds));
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

    // Main query to fetch commissions and their direct relations
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
    const commissionSalesMap = new Map<string, typeof allCommissionSales>();
    allCommissionSales.forEach((cs) => {
      const key = cs.commissionId;
      if (!commissionSalesMap.has(key)) {
        commissionSalesMap.set(key, []);
      }
      commissionSalesMap.get(key)?.push(cs);
    });

    // Fetch commission_recipients (main summary per agent)
    const allCommissionRecipients =
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
    const commissionRecipientsMap = new Map<
      string,
      typeof allCommissionRecipients
    >();
    allCommissionRecipients.forEach((cr) => {
      const key = cr.commissionId;
      if (!commissionRecipientsMap.has(key)) {
        commissionRecipientsMap.set(key, []);
      }
      commissionRecipientsMap.get(key)?.push(cr);
    });

    // Fetch commission_recipient_sales (granular allocations)
    const commissionSalesIds = allCommissionSales.map((cs) => cs.id);
    const allCommissionRecipientSales =
      commissionSalesIds.length > 0
        ? await db.query.commissionRecipientSalesTable.findMany({
            where: inArray(
              commissionRecipientSalesTable.commissionSalesId,
              commissionSalesIds
            ),
          })
        : [];

    const commissionsWithRelations = rawCommissions.map((c) => {
      const relatedCommissionSales =
        commissionSalesMap.get(c.commission.id) || [];
      const relatedRecipients =
        commissionRecipientsMap.get(c.commission.id) || [];

      // Map granular recipient sales to their respective commissionSales entries
      const commissionSalesWithRecipientSales = relatedCommissionSales.map(
        (cs) => {
          const recipientsForThisSale = allCommissionRecipientSales
            .filter((crs) => crs.commissionSalesId === cs.id)
            .map((crs) => ({
              recipientSale: crs,
              // Find the corresponding overall recipient and sales agent
              commissionRecipient: relatedRecipients.find(
                (cr) => cr.id === crs.commissionRecipientId
              )!,
            }));

          return {
            commissionSale: cs,
            sale: cs.sale,
            withholdingTax: cs.withholdingTax,
            recipients: recipientsForThisSale,
          };
        }
      );

      return {
        commission: c.commission,
        customer: c.customer!,
        commissionSales: commissionSalesWithRecipientSales,
        recipients: relatedRecipients.map((r) => ({
          recipient: r,
          salesAgent: r.salesAgent,
          payingAccount: r.payingAccount,
        })),
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
