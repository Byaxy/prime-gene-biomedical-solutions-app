/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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
  AccountWithRelations,
  ExpenseCategoryWithRelations,
} from "@/types";
import { useCommissions } from "@/hooks/useCommissions";
import toast from "react-hot-toast";
import { cn, formatDateTime, parseServerError } from "@/lib/utils";
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
import { useEffect, useState, useRef } from "react";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";

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
  const [
    displayedCurrentReceivingAccountBalance,
    setDisplayedCurrentReceivingAccountBalance,
  ] = useState<number | null>(null);
  const { user } = useAuth();
  const {
    softDeleteCommission,
    isSoftDeletingCommission,
    payoutCommissionRecipient,
    isPayingOutCommissionRecipient,
  } = useCommissions();
  const { accounts: allAccounts } = useAccounts({ getAllAccounts: true });
  const { expenseCategories } = useExpenseCategories({
    getAllCategories: true,
  });

  // Use ref to track if we've already initialized the form for this recipient
  const initializedRecipientRef = useRef<string | null>(null);

  const handleDelete = async () => {
    try {
      if (commission?.commission?.id && user?.id) {
        await softDeleteCommission(
          { id: commission.commission.id },
          {
            onSuccess: () => {
              toast.success("Commission deleted successfully.");
              onOpenChange();
            },
            onError: (error) => {
              console.error("Error deactivating commission:", error);
              toast.error(error.message || "Failed to delete commission.");
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
      expenseCategoryId: "",
      paidDate: new Date(),
      notes: "",
      amountToPay: 0,
      currentPayingAccountBalance: 0,
    },
  });

  const selectedRecipientId = payoutForm.watch("recipientId");
  const selectedPayingAccountId = payoutForm.watch("payingAccountId");

  const handlePayoutForRecipient = async (
    values: CommissionRecipientPayoutFormValues
  ) => {
    const loadingToastId = toast.loading("Processing payout...");
    try {
      if (!selectedRecipientId || !user?.id) {
        throw new Error("Recipient or User not identified for payout.");
      }

      await payoutCommissionRecipient(
        { recipientId: values.recipientId, values, userId: user.id },
        {
          onSuccess: () => {
            toast.success("Recipient paid successfully!", {
              id: loadingToastId,
            });
            onOpenChange();
          },
          onError: (error) => {
            toast.error(
              parseServerError(error) || "Failed to process payout.",
              {
                id: loadingToastId,
                duration: 6000,
              }
            );
          },
        }
      );
    } catch (error: any) {
      console.error("Payout error:", error);
      toast.error(parseServerError(error), {
        id: loadingToastId,
        duration: 6000,
      });
    }
  };

  // Effect to set form defaults when a recipient is selected for payout
  // FIXED: Removed payoutForm from dependencies to prevent infinite loop
  useEffect(() => {
    if (
      selectedRecipientId &&
      mode === "payout" &&
      initializedRecipientRef.current !== selectedRecipientId
    ) {
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
          payingAccountId: recipient.recipient.payingAccountId || "",
          paidDate: new Date(),
          notes: "",
          amountToPay: parseFloat(recipient.recipient.amount as any) || 0,
          currentPayingAccountBalance:
            parseFloat(payingAccount?.account?.currentBalance as any) || 0,
        });

        // Mark this recipient as initialized
        initializedRecipientRef.current = selectedRecipientId;
      }
    }
  }, [
    selectedRecipientId,
    mode,
    commission.recipients,
    allAccounts,
    payoutForm,
  ]);

  // Reset the initialized ref when dialog closes or mode changes
  useEffect(() => {
    if (!open || mode !== "payout") {
      initializedRecipientRef.current = null;
    }
  }, [open, mode]);

  // Update currentPayingAccountBalance when payingAccountId changes
  useEffect(() => {
    if (mode === "payout" && selectedPayingAccountId) {
      const account = allAccounts.find(
        (acc: AccountWithRelations) =>
          acc.account.id === selectedPayingAccountId
      );
      if (account) {
        const newBalance =
          parseFloat(account.account.currentBalance as any) || 0;
        payoutForm.setValue("currentPayingAccountBalance", newBalance, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setDisplayedCurrentReceivingAccountBalance(newBalance);
      } else {
        payoutForm.setValue("currentPayingAccountBalance", undefined, {
          shouldValidate: true,
        });
        setDisplayedCurrentReceivingAccountBalance(null);
      }
    }
  }, [payoutForm, allAccounts, mode, selectedPayingAccountId]);

  if (!commission?.commission) {
    return null;
  }

  // Filter pending recipients for payout
  const pendingRecipients = commission.recipients.filter(
    (r) => r.recipient.paymentStatus === CommissionPaymentStatus.Pending
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-6xl bg-light-200 overflow-y-auto max-h-[90vh]",
          (mode === "view" || mode === "payout") && "sm:max-w-[90rem]"
        )}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onInteractOutside={(e) => {
          if (e.target instanceof Element) {
            if (
              e.target.closest('[role="listbox"]') ||
              e.target.closest("[data-radix-select-viewport]")
            ) {
              e.preventDefault();
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            {mode === "delete"
              ? "Delete Commission"
              : mode === "payout"
              ? `Process Commission Payout for: ${commission.commission.commissionRefNumber}`
              : `Commission Details: ${commission.commission.commissionRefNumber}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {mode === "delete"
              ? "Are you sure you want to delete this commission? This action will prevent further use and any pending payouts will be cancelled."
              : mode === "payout"
              ? `Select a recipient to process their payment for commission ${commission.commission.commissionRefNumber}.`
              : `Details for Commission (${commission.commission.commissionRefNumber})`}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-blue-800">
              <div className="space-y-2">
                <p className="font-semibold">Ref. Number:</p>
                <p>{commission.commission.commissionRefNumber}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Date:</p>
                <p>
                  {
                    formatDateTime(commission.commission.commissionDate)
                      .dateOnly
                  }
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Amount Received (Net Sales):</p>
                <p>
                  <FormatNumber
                    value={commission.commission.totalAmountReceived}
                  />
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Additions:</p>
                <p>
                  <FormatNumber value={commission.commission.totalAdditions} />
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Deductions:</p>
                <p>
                  <FormatNumber value={commission.commission.totalDeductions} />
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">WHT Amount:</p>
                <p>
                  <FormatNumber
                    value={commission.commission.totalWithholdingTaxAmount}
                  />
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Total Commission Payable:</p>
                <p>
                  <FormatNumber
                    value={commission.commission.totalCommissionPayable}
                  />
                </p>
              </div>
              <div className="col-span-3 space-y-2">
                <p className="font-semibold">Internal Notes:</p>
                <p>{commission.commission.notes || "N/A"}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Status:</p>
                <p>
                  <span
                    className={cn(
                      " capitalize",
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
              <div className="space-y-2">
                <p className="font-semibold">Payment Status:</p>
                <p>
                  <span
                    className={cn(
                      " capitalize",
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
              <div className="space-y-2">
                <p className="font-semibold">Created At:</p>
                <p>
                  {formatDateTime(commission.commission.createdAt).dateTime}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-6">
              <h3 className="text-lg font-semibold text-blue-800">
                Related Sales
              </h3>
              <Table className="shad-table">
                <TableHeader className="bg-blue-800 text-white">
                  <TableRow>
                    <TableHead className="w-[5%] text-center">#</TableHead>
                    <TableHead className="w-[10%]">Invoice No.</TableHead>
                    <TableHead className="w-[10%]">Amount Recv.</TableHead>
                    <TableHead className="w-[8%]">Comm. Rate</TableHead>
                    <TableHead className="w-[7%]">WHT Rate</TableHead>
                    <TableHead className="w-[8%]">WHT Amount</TableHead>
                    <TableHead className="w-[8%]">Gross Comm.</TableHead>
                    <TableHead className="w-[8%]">Additions</TableHead>
                    <TableHead className="w-[8%]">Deductions</TableHead>
                    <TableHead className="w-[8%]">Net Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="w-full bg-white text-blue-800">
                  {commission.commissionSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        {` No Sales Found.`}
                      </TableCell>
                    </TableRow>
                  )}
                  {commission.commissionSales.map((entry, index) => (
                    <TableRow
                      key={entry.commissionSale.id}
                      className={cn("w-full", {
                        "bg-blue-50": index % 2 === 1,
                      })}
                    >
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>{entry.sale.invoiceNumber}</TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.amountReceived}
                        />
                      </TableCell>
                      <TableCell>
                        {entry.commissionSale.commissionRate}%
                      </TableCell>
                      <TableCell>
                        {entry.commissionSale.withholdingTaxRate}%
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.withholdingTaxAmount || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.grossCommission || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.additions || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.deductions || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.commissionPayable || 0}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  {commission.commissionSales.length > 0 && (
                    <TableRow className="font-bold bg-blue-100">
                      <TableCell colSpan={9} className="text-right">
                        Total Commission Payable:
                      </TableCell>
                      <TableCell className="text-left">
                        <FormatNumber
                          value={commission.commission.totalCommissionPayable}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-4 pt-5">
              <h3 className="text-lg font-semibold text-blue-800">
                Recipients
              </h3>
              <Table className="shad-table">
                <TableHeader className="bg-blue-800 text-white">
                  <TableRow>
                    <TableHead className="w-[5%] text-center">#</TableHead>
                    <TableHead className="w-[30%]">Sales Agent</TableHead>
                    <TableHead className="w-[20%]">Amount</TableHead>
                    <TableHead className="w-[20%]">Source of Funds</TableHead>
                    <TableHead className="w-[25%]">Payment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="w-full bg-white text-blue-800">
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
                            "rounded-xl px-3 py-1 text-white capitalize",
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
                key={`recipient-${selectedRecipientId || ""}`}
              >
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
                    <FormatNumber value={rec.recipient.amount} />
                  </SelectItem>
                ))}
              </CustomFormField>

              <CustomFormField
                fieldType={FormFieldType.AMOUNT}
                control={payoutForm.control}
                name="amountToPay"
                label="Amount to Pay"
                placeholder="0.00"
                disabled={true}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1">
                  <CustomFormField
                    key={`payingAccount-${selectedPayingAccountId || ""}`}
                    fieldType={FormFieldType.SELECT}
                    control={payoutForm.control}
                    name="payingAccountId"
                    label="Source of Funds"
                    placeholder="Select paying account"
                    disabled={isPayingOutCommissionRecipient}
                  >
                    {allAccounts.map((account: AccountWithRelations) => (
                      <SelectItem
                        key={account.account.id}
                        value={account.account.id}
                        className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                      >
                        {account.account.name} (
                        {account.account.accountNumber || "N/A"})
                      </SelectItem>
                    ))}
                  </CustomFormField>
                  {selectedPayingAccountId && (
                    <p
                      className={cn(
                        "text-sm pl-2",
                        displayedCurrentReceivingAccountBalance &&
                          displayedCurrentReceivingAccountBalance > 0
                          ? "text-green-500"
                          : "text-red-600",
                        payoutForm.formState.errors.currentPayingAccountBalance
                          ?.message ||
                          payoutForm.formState.errors.payingAccountId?.message
                          ? "text-red-600"
                          : ""
                      )}
                    >
                      Current Balance:{" "}
                      <span className="font-semibold">
                        <FormatNumber
                          value={displayedCurrentReceivingAccountBalance || 0}
                        />
                      </span>
                      {payoutForm.formState.errors.payingAccountId?.message && (
                        <span className="ml-2 text-red-600">
                          ({payoutForm.formState.errors.payingAccountId.message}
                          )
                        </span>
                      )}
                      {payoutForm.formState.errors.currentPayingAccountBalance
                        ?.message && (
                        <span className="ml-2 text-red-600">
                          (
                          {
                            payoutForm.formState.errors
                              .currentPayingAccountBalance.message
                          }
                          )
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <CustomFormField
                  fieldType={FormFieldType.SELECT}
                  control={payoutForm.control}
                  name={"expenseCategoryId"}
                  label="Expense Category"
                  placeholder="Select category"
                  disabled={isPayingOutCommissionRecipient}
                >
                  {expenseCategories.map(
                    (cat: ExpenseCategoryWithRelations) => (
                      <SelectItem
                        key={cat.expenseCategory.id}
                        value={cat.expenseCategory.id || ""}
                        className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                      >
                        {cat.expenseCategory.name}
                      </SelectItem>
                    )
                  )}
                </CustomFormField>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <CustomFormField
                  fieldType={FormFieldType.DATE_PICKER}
                  control={payoutForm.control}
                  name="paidDate"
                  label="Paid Date"
                  dateFormat="MM/dd/yyyy"
                  disabled={isPayingOutCommissionRecipient}
                />
              </div>
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
                  className="shad-danger-btn"
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
              Delete Commission
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommissionDialog;
