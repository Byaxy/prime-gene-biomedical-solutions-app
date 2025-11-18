/* eslint-disable @typescript-eslint/no-explicit-any */
// components/commissions/CommissionDialog.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CommissionWithRelations,
  CommissionPaymentStatus,
  CommissionStatus,
  Account,
  AccountWithRelations,
} from "@/types";
import { useCommissions } from "@/hooks/useCommissions";
import toast from "react-hot-toast";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CommissionRecipientPayoutFormValidation,
  CommissionRecipientPayoutFormValues,
} from "@/lib/validation";
import { SelectItem } from "../ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import SubmitButton from "../SubmitButton";
import { Form } from "../ui/form";

interface CommissionDialogProps {
  mode: "view" | "payout" | "status" | "delete";
  open: boolean;
  onOpenChange: () => void;
  commission: CommissionWithRelations;
}

const CommissionDialog: React.FC<CommissionDialogProps> = ({
  mode,
  open,
  onOpenChange,
  commission,
}) => {
  const { user } = useAuth();
  const {
    softDeleteCommission,
    isSoftDeletingCommission,
    payoutCommissionRecipient,
    isPayingOutCommissionRecipient,
  } = useCommissions();
  const { accounts: allAccounts } = useAccounts({ getAllAccounts: true });

  const handleDelete = async () => {
    try {
      if (commission?.commission?.id && user?.id) {
        await softDeleteCommission(
          { id: commission.commission.id },
          {
            onSuccess: () => {
              toast.success("Commission deactivated successfully.");
              onOpenChange();
            },
            onError: (error) => {
              console.error("Error deactivating commission:", error);
              toast.error(error.message || "Failed to deactivate commission.");
            },
          }
        );
      } else {
        throw new Error("Commission ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };

  const payoutForm = useForm<CommissionRecipientPayoutFormValues>({
    resolver: zodResolver(CommissionRecipientPayoutFormValidation),
    mode: "all",
    defaultValues: {
      recipientId: "",
      payingAccountId: "",
      paidDate: new Date(),
      notes: "",
      amountToPay: 0,
      currentPayingAccountBalance: 0,
    },
  });

  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null
  );

  const handlePayoutForRecipient = async (
    values: CommissionRecipientPayoutFormValues
  ) => {
    const loadingToastId = toast.loading("Processing payout...");
    try {
      if (!selectedRecipientId || !user?.id) {
        throw new Error("Recipient or User not identified for payout.");
      }

      await payoutCommissionRecipient(
        { recipientId: selectedRecipientId, values, userId: user.id },
        {
          onSuccess: () => {
            toast.success("Recipient paid successfully!", {
              id: loadingToastId,
            });
            onOpenChange();
          },
          onError: (error) => {
            toast.error(error.message || "Failed to process payout.", {
              id: loadingToastId,
            });
          },
        }
      );
    } catch (error: any) {
      console.error("Payout error:", error);
      toast.error(
        error.message || "An unexpected error occurred during payout.",
        { id: loadingToastId }
      );
    }
  };

  // Effect to set form defaults when a recipient is selected for payout
  React.useEffect(() => {
    if (selectedRecipientId && mode === "payout") {
      const recipient = commission.recipients.find(
        (r) => r.recipient.id === selectedRecipientId
      );
      if (recipient) {
        const payingAccount = allAccounts.find(
          (acc: AccountWithRelations) =>
            acc.account.id === recipient.recipient.payingAccountId
        );
        payoutForm.reset({
          recipientId: recipient.recipient.id,
          paidDate: new Date(),
          notes: "",
          amountToPay: parseFloat(recipient.recipient.amount as any) || 0,
          currentPayingAccountBalance:
            parseFloat(payingAccount?.currentBalance as any) || 0,
        });
      }
    }
  }, [
    selectedRecipientId,
    mode,
    commission.recipients,
    allAccounts,
    payoutForm,
  ]);

  // Watch selected paying account for balance display
  const selectedPayingAccountId = payoutForm.watch("payingAccountId");
  const currentPayingAccountBalance = payoutForm.watch(
    "currentPayingAccountBalance"
  );

  // Update currentPayingAccountBalance when payingAccountId changes
  React.useEffect(() => {
    if (mode === "payout" && selectedPayingAccountId) {
      const account = allAccounts.find(
        (acc: AccountWithRelations) =>
          acc.account.id === selectedPayingAccountId
      );
      if (account) {
        payoutForm.setValue(
          "currentPayingAccountBalance",
          parseFloat(account.currentBalance as any) || 0,
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        );
      }
    }
  }, [selectedPayingAccountId, allAccounts, payoutForm, mode]);

  if (!commission?.commission) {
    return null;
  }

  // Filter pending recipients for payout
  const pendingRecipients = commission.recipients.filter(
    (r) => r.recipient.paymentStatus === CommissionPaymentStatus.Pending
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-light-200 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            {mode === "delete"
              ? "Deactivate Commission"
              : mode === "payout"
              ? `Process Commission Payout for: ${commission.commission.commissionRefNumber}`
              : `Commission Details: ${commission.commission.commissionRefNumber}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {mode === "delete"
              ? "Are you sure you want to deactivate this commission? This action will prevent further use and any pending payouts will be cancelled."
              : mode === "payout"
              ? `Select a recipient to process their payment for commission ${commission.commission.commissionRefNumber}.`
              : `Details for Commission (${commission.commission.commissionRefNumber}) related to Sale: ${commission.sale.invoiceNumber}.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-dark-600">
              <div>
                <p className="font-semibold">Ref. Number:</p>
                <p>{commission.commission.commissionRefNumber}</p>
              </div>
              <div>
                <p className="font-semibold">Date:</p>
                <p>
                  {
                    formatDateTime(commission.commission.commissionDate)
                      .dateOnly
                  }
                </p>
              </div>
              <div>
                <p className="font-semibold">Related Sale:</p>
                <p>{commission.sale.invoiceNumber}</p>
              </div>

              <div>
                <p className="font-semibold">Amount Received (Net Sales):</p>
                <p>
                  <FormatNumber value={commission.commission.amountReceived} />
                </p>
              </div>
              <div>
                <p className="font-semibold">Additions:</p>
                <p>
                  <FormatNumber value={commission.commission.additions} />
                </p>
              </div>
              <div>
                <p className="font-semibold">Deductions:</p>
                <p>
                  <FormatNumber value={commission.commission.deductions} />
                </p>
              </div>
              <div>
                <p className="font-semibold">Commission Rate:</p>
                <p>{commission.commission.commissionRate}%</p>
              </div>
              <div>
                <p className="font-semibold">Withholding Tax:</p>
                <p>
                  {commission.withholdingTax?.name || "N/A"} (
                  {commission.commission.withholdingTaxRate}%)
                </p>
              </div>
              <div>
                <p className="font-semibold">WHT Amount:</p>
                <p>
                  <FormatNumber
                    value={commission.commission.withholdingTaxAmount}
                  />
                </p>
              </div>
              <div>
                <p className="font-semibold">Total Commission Payable:</p>
                <p>
                  <FormatNumber
                    value={commission.commission.totalCommissionPayable}
                  />
                </p>
              </div>
              <div className="col-span-3">
                <p className="font-semibold">Internal Notes:</p>
                <p>{commission.commission.notes || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Status:</p>
                <p>
                  <span
                    className={cn(
                      "text-14-medium capitalize",
                      {
                        "bg-yellow-500":
                          commission.commission.status ===
                          CommissionStatus.PendingApproval,
                        "bg-blue-600":
                          commission.commission.status ===
                          CommissionStatus.Approved,
                        "bg-green-500":
                          commission.commission.status ===
                          CommissionStatus.Processed,
                        "bg-red-600":
                          commission.commission.status ===
                          CommissionStatus.Cancelled,
                      },
                      "text-white px-3 py-1 rounded-xl"
                    )}
                  >
                    {commission.commission.status.split("_").join(" ")}
                  </span>
                </p>
              </div>
              <div>
                <p className="font-semibold">Payment Status:</p>
                <p>
                  <span
                    className={cn(
                      "text-14-medium capitalize",
                      {
                        "bg-yellow-500":
                          commission.commission.paymentStatus ===
                          CommissionPaymentStatus.Pending,
                        "bg-orange-500":
                          commission.commission.paymentStatus ===
                          CommissionPaymentStatus.Partial,
                        "bg-green-500":
                          commission.commission.paymentStatus ===
                          CommissionPaymentStatus.Paid,
                        "bg-red-600":
                          commission.commission.paymentStatus ===
                          CommissionPaymentStatus.Cancelled,
                      },
                      "text-white px-3 py-1 rounded-xl"
                    )}
                  >
                    {commission.commission.paymentStatus.split("_").join(" ")}
                  </span>
                </p>
              </div>
              <div>
                <p className="font-semibold">Created At:</p>
                <p>
                  {formatDateTime(commission.commission.createdAt).dateTime}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-blue-700 mt-6 mb-3">
              Recipients
            </h3>
            <Table className="shad-table">
              <TableHeader className="bg-gray-200 text-dark-500">
                <TableRow>
                  <TableHead className="w-[5%] text-center">#</TableHead>
                  <TableHead className="w-[30%]">Sales Agent</TableHead>
                  <TableHead className="w-[20%]">Amount</TableHead>
                  <TableHead className="w-[20%]">Source of Funds</TableHead>
                  <TableHead className="w-[25%]">Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commission.recipients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No recipients assigned.
                    </TableCell>
                  </TableRow>
                )}
                {commission.recipients.map((rec, index) => (
                  <TableRow key={rec.recipient.id}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell>{rec.salesAgent.name}</TableCell>
                    <TableCell>
                      <FormatNumber value={rec.recipient.amount} />
                    </TableCell>
                    <TableCell>{rec.payingAccount?.name || "N/A"}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-xl px-3 py-1 text-white text-14-medium capitalize",
                          {
                            "bg-yellow-500":
                              rec.recipient.paymentStatus ===
                              CommissionPaymentStatus.Pending,
                            "bg-green-500":
                              rec.recipient.paymentStatus ===
                              CommissionPaymentStatus.Paid,
                            "bg-red-600":
                              rec.recipient.paymentStatus ===
                              CommissionPaymentStatus.Cancelled,
                          }
                        )}
                      >
                        {rec.recipient.paymentStatus}{" "}
                        {rec.recipient.paidDate &&
                          `(${
                            formatDateTime(rec.recipient.paidDate).dateOnly
                          })`}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {mode === "payout" && (
          <Form {...payoutForm}>
            <form
              onSubmit={payoutForm.handleSubmit(handlePayoutForRecipient)}
              className="space-y-4"
            >
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={payoutForm.control}
                name="recipientId"
                label="Select Recipient for Payout"
                placeholder="Choose an agent to pay"
                disabled={isPayingOutCommissionRecipient}
                onValueChange={(e) =>
                  setSelectedRecipientId(e.currentTarget.value)
                }
              >
                <SelectItem value="" disabled className="text-gray-500">
                  Select a recipient...
                </SelectItem>
                {pendingRecipients.map((rec) => (
                  <SelectItem
                    key={rec.recipient.id}
                    value={rec.recipient.id}
                    className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                    disabled={
                      rec.recipient.paymentStatus !==
                      CommissionPaymentStatus.Pending
                    }
                  >
                    {rec.salesAgent.name} -{" "}
                    <FormatNumber value={rec.recipient.amount} /> (Source:{" "}
                    {rec.payingAccount?.name || "N/A"})
                  </SelectItem>
                ))}
              </CustomFormField>

              {selectedRecipientId && (
                <>
                  <CustomFormField
                    fieldType={FormFieldType.AMOUNT}
                    control={payoutForm.control}
                    name="amountToPay"
                    label="Amount to Pay"
                    placeholder="0.00"
                    disabled={true}
                  />
                  <CustomFormField
                    fieldType={FormFieldType.SELECT}
                    control={payoutForm.control}
                    name="payingAccountId"
                    label="Source of Funds"
                    placeholder="Select paying account"
                    disabled={true}
                  >
                    {allAccounts.map((account: Account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id}
                        className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                      >
                        {account.name} ({account.accountNumber || "N/A"})
                      </SelectItem>
                    ))}
                  </CustomFormField>
                  {selectedPayingAccountId && (
                    <p
                      className={cn(
                        "text-sm pl-2",
                        currentPayingAccountBalance &&
                          currentPayingAccountBalance > 0
                          ? "text-green-500"
                          : "text-red-600"
                      )}
                    >
                      Current Balance:{" "}
                      <span className="font-semibold">
                        <FormatNumber
                          value={currentPayingAccountBalance || 0}
                        />
                      </span>
                      {payoutForm.formState.errors.payingAccountId?.message && (
                        <span className="ml-2 text-red-600">
                          ({payoutForm.formState.errors.payingAccountId.message}
                          )
                        </span>
                      )}
                    </p>
                  )}
                  <CustomFormField
                    fieldType={FormFieldType.DATE_PICKER}
                    control={payoutForm.control}
                    name="paidDate"
                    label="Paid Date"
                    dateFormat="MM/dd/yyyy"
                    disabled={isPayingOutCommissionRecipient}
                  />
                  <CustomFormField
                    fieldType={FormFieldType.TEXTAREA}
                    control={payoutForm.control}
                    name="notes"
                    label="Payout Notes (Optional)"
                    placeholder="Add any notes for this payment"
                    disabled={isPayingOutCommissionRecipient}
                  />
                  <div className="flex justify-end gap-4 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onOpenChange}
                      disabled={isPayingOutCommissionRecipient}
                    >
                      Cancel
                    </Button>
                    <SubmitButton
                      isLoading={isPayingOutCommissionRecipient}
                      className="shad-primary-btn"
                      disabled={
                        !selectedRecipientId || isPayingOutCommissionRecipient
                      }
                    >
                      Confirm Payout
                    </SubmitButton>
                  </div>
                </>
              )}
            </form>
          </Form>
        )}

        {mode === "delete" && (
          <div className="flex justify-end gap-4 mt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSoftDeletingCommission}
              className="shad-danger-btn"
            >
              Deactivate Commission
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommissionDialog;
