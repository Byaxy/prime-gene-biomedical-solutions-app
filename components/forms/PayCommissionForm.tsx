/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import {
  AccountWithRelations,
  CommissionPaymentStatus,
  CommissionWithRelations,
  ExpenseCategoryWithRelations,
} from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useCommissions } from "@/hooks/useCommissions";
import { cn, parseServerError } from "@/lib/utils";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import FormatNumber from "../FormatNumber";
import { SelectItem } from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import DeleteIcon from "@mui/icons-material/Delete";
import { Plus } from "lucide-react";
import {
  CommissionRecipientPayoutFormValidation,
  CommissionRecipientPayoutFormValues,
} from "@/lib/validation";
import { useRouter } from "next/navigation";

interface PayCommissionFormProps {
  commission: CommissionWithRelations;
  accounts: AccountWithRelations[];
  expenseCategories: ExpenseCategoryWithRelations[];
}

const PayCommissionForm = ({
  commission,
  accounts,
  expenseCategories,
}: PayCommissionFormProps) => {
  const { user } = useAuth();
  const { processCommissionPayouts, isProcessingCommissionPayouts } =
    useCommissions();
  const router = useRouter();

  const form = useForm<CommissionRecipientPayoutFormValues>({
    resolver: zodResolver(CommissionRecipientPayoutFormValidation),
    mode: "all",
    defaultValues: {
      payoutDate: new Date(),
      payouts: [],
      notes: "",
    },
  });

  const {
    fields: payoutFields,
    append: appendPayout,
    remove: removePayout,
    update: updatePayout,
  } = useFieldArray({
    control: form.control,
    name: "payouts",
  });

  // Filter recipients who still have amounts pending or partial
  const payableRecipients = useMemo(
    () =>
      commission.recipients.filter(
        (r) =>
          r.recipient.paymentStatus === CommissionPaymentStatus.Pending ||
          r.recipient.paymentStatus === CommissionPaymentStatus.Partial
      ),
    [commission.recipients]
  );

  const handleAddPayoutRow = () => {
    appendPayout({
      commissionRecipientId: "",
      amountToPay: 0,
      payingAccountId: "",
      expenseCategoryId: "",
      recipientName: "",
      allocatedAmount: 0,
      paidSoFar: 0,
      remainingDue: 0,
      currentPayingAccountBalance: 0,
    });
  };

  const handleDeletePayoutRow = (index: number) => {
    removePayout(index);
    toast.success("Payout row removed.");
  };

  // When a recipient is selected for a specific row
  const handleRecipientChange = (index: number, newRecipientId: string) => {
    const currentField = payoutFields[index];
    const recipient = payableRecipients.find(
      (r) => r.recipient.id === newRecipientId
    );

    if (recipient) {
      // Preserve current amountToPay if it's not the initial selection or default
      const amountToPayToPreserve =
        currentField.commissionRecipientId === newRecipientId &&
        currentField.amountToPay !== 0 &&
        currentField.amountToPay !== currentField.remainingDue
          ? currentField.amountToPay
          : recipient.remainingDue;

      updatePayout(index, {
        ...currentField,
        commissionRecipientId: recipient.recipient.id,
        recipientName: recipient.salesAgent.name,
        allocatedAmount: parseFloat(recipient.recipient.amount as any),
        paidSoFar: recipient.paidSoFar,
        remainingDue: recipient.remainingDue,
        amountToPay: amountToPayToPreserve,
        payingAccountId: "",
        expenseCategoryId: "",
        currentPayingAccountBalance: 0,
      });
      form.trigger(`payouts.${index}.commissionRecipientId`);
      form.trigger(`payouts.${index}.amountToPay`);
      form.trigger(`payouts.${index}.payingAccountId`);
      form.trigger(`payouts.${index}.expenseCategoryId`);
    } else {
      // If recipient is deselected, clear all related fields for that row
      updatePayout(index, {
        ...currentField,
        commissionRecipientId: "",
        recipientName: "",
        allocatedAmount: 0,
        paidSoFar: 0,
        remainingDue: 0,
        amountToPay: 0,
        payingAccountId: "",
        expenseCategoryId: "",
        currentPayingAccountBalance: 0,
      });
    }
  };
  // When a paying account is selected for a specific row
  const handlePayingAccountChange = (index: number, accountId: string) => {
    const account = accounts.find((acc) => acc.account.id === accountId);
    updatePayout(index, {
      ...payoutFields[index],
      payingAccountId: accountId,
      currentPayingAccountBalance:
        parseFloat(account?.account.currentBalance as any) || 0,
    });
    form.trigger(`payouts.${index}.payingAccountId`);
  };

  const handleAmountToPayChange = (index: number, amount: number) => {
    updatePayout(index, {
      ...payoutFields[index],
      amountToPay: amount,
    });
    form.trigger(`payouts.${index}.amountToPay`);
  };

  const onSubmit = async (values: CommissionRecipientPayoutFormValues) => {
    const loadingToastId = toast.loading("Processing batch payouts...");
    try {
      if (!user?.id) {
        throw new Error("User not identified for payouts.");
      }

      await processCommissionPayouts(
        { values, userId: user.id },
        {
          onSuccess: () => {
            toast.success("Batch payouts processed successfully!", {
              id: loadingToastId,
            });
            form.reset({
              payoutDate: new Date(),
              payouts: [],
              notes: "",
            });
            router.push("/accounting-and-finance/commissions");
            router.refresh();
          },
          onError: (error) => {
            toast.error(
              parseServerError(error) || "Failed to process batch payouts.",
              {
                id: loadingToastId,
                duration: 6000,
              }
            );
          },
        }
      );
    } catch (error: any) {
      console.error("Batch payout error:", error);
      toast.error(parseServerError(error), {
        id: loadingToastId,
        duration: 6000,
      });
    }
  };

  const totalAmountToPay = form
    .watch("payouts")
    .reduce((sum, p) => sum + (p.amountToPay || 0), 0);

  // Memoize accounts map for efficient lookup in the render loop
  const accountsMap = useMemo(() => {
    return new Map(accounts.map((acc) => [acc.account.id, acc]));
  }, [accounts]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 text-dark-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CustomFormField
            fieldType={FormFieldType.DATE_PICKER}
            control={form.control}
            name="payoutDate"
            label="Overall Payout Date"
            dateFormat="MM/dd/yyyy"
            disabled={isProcessingCommissionPayouts}
          />
        </div>

        {/* --- Payout Entries Table --- */}
        <div
          className={cn(
            "space-y-3 p-3 rounded-md border bg-white",
            form.formState.errors.payouts ? "border-red-500" : "border-gray-300"
          )}
        >
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-semibold text-blue-800">
              Individual Payouts
            </h4>
            <Button
              type="button"
              onClick={handleAddPayoutRow}
              className="shad-primary-btn flex items-center gap-2"
              disabled={
                isProcessingCommissionPayouts || payableRecipients.length === 0
              }
            >
              <Plus className="h-4 w-4" /> Add Payout
            </Button>
          </div>

          <Table className="shad-table">
            <TableHeader className="bg-blue-800 text-white">
              <TableRow>
                <TableHead className="w-[3%] text-center">#</TableHead>
                <TableHead className="w-[18%]">Recipient</TableHead>
                <TableHead className="w-[9%]">Allocated</TableHead>
                <TableHead className="w-[9%]">Paid So Far</TableHead>
                <TableHead className="w-[9%]">Remaining Due</TableHead>
                <TableHead className="w-[12%]">Amount to Pay</TableHead>
                <TableHead className="w-[15%]">Paying Account</TableHead>
                <TableHead className="w-[15%]">Expense Category</TableHead>
                <TableHead className="w-[8%] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {payoutFields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-4">
                    {` No payouts added. Click "Add Payout" to select recipients.`}
                  </TableCell>
                </TableRow>
              )}
              {payoutFields.map((field, index) => {
                const selectedRecipientData = payableRecipients.find(
                  (r) => r.recipient.id === field.commissionRecipientId
                );

                const currentPayingAccountBalance =
                  accountsMap.get(field.payingAccountId)?.account
                    .currentBalance || 0;

                return (
                  <TableRow
                    key={field.id}
                    className={cn("w-full", { "bg-blue-50": index % 2 === 1 })}
                  >
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.SELECT}
                        control={form.control}
                        name={`payouts.${index}.commissionRecipientId`}
                        label=""
                        placeholder="Select recipient"
                        disabled={isProcessingCommissionPayouts}
                        onValueChange={(e) => {
                          handleRecipientChange(index, e);
                        }}
                      >
                        {payableRecipients
                          .filter(
                            (rec) =>
                              !payoutFields.some(
                                (p, i) =>
                                  i !== index &&
                                  p.commissionRecipientId === rec.recipient.id
                              )
                          )
                          .map((rec) => (
                            <SelectItem
                              key={rec.recipient.id}
                              value={rec.recipient.id}
                              className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                            >
                              {rec.salesAgent.name}
                            </SelectItem>
                          ))}
                      </CustomFormField>
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={selectedRecipientData?.recipient.amount || 0}
                      />
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={selectedRecipientData?.paidSoFar || 0}
                      />
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={selectedRecipientData?.remainingDue || 0}
                      />
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.AMOUNT}
                        control={form.control}
                        name={`payouts.${index}.amountToPay`}
                        label=""
                        placeholder="0.00"
                        disabled={
                          isProcessingCommissionPayouts ||
                          !field.commissionRecipientId
                        }
                        max={selectedRecipientData?.remainingDue || 0}
                        onValueChange={(e) =>
                          handleAmountToPayChange(index, parseFloat(e))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.SELECT}
                        control={form.control}
                        name={`payouts.${index}.payingAccountId`}
                        label=""
                        placeholder="Select account"
                        disabled={
                          isProcessingCommissionPayouts ||
                          !field.commissionRecipientId
                        }
                        onValueChange={(e) =>
                          handlePayingAccountChange(index, e)
                        }
                      >
                        {accounts.map((account) => (
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
                      {field.payingAccountId && (
                        <p
                          className={cn(
                            "text-xs pl-2",
                            (field.amountToPay || 0) <=
                              currentPayingAccountBalance + 0.01
                              ? "text-green-500"
                              : "text-red-600"
                          )}
                        >
                          Balance:{" "}
                          <FormatNumber value={currentPayingAccountBalance} />
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.SELECT}
                        control={form.control}
                        name={`payouts.${index}.expenseCategoryId`}
                        label=""
                        placeholder="Select category"
                        disabled={
                          isProcessingCommissionPayouts ||
                          !field.commissionRecipientId
                        }
                      >
                        {expenseCategories.map((cat) => (
                          <SelectItem
                            key={cat.expenseCategory.id}
                            value={cat.expenseCategory.id || ""}
                            className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                          >
                            {cat.expenseCategory.name}
                          </SelectItem>
                        ))}
                      </CustomFormField>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-row items-center justify-center">
                        <span
                          onClick={() => {
                            if (!isProcessingCommissionPayouts)
                              handleDeletePayoutRow(index);
                          }}
                          className={cn(
                            "p-1 cursor-pointer",
                            isProcessingCommissionPayouts
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-600 hover:bg-light-200 hover:rounded-md"
                          )}
                        >
                          <DeleteIcon className="h-5 w-5" />
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {payoutFields.length > 0 && (
                <TableRow className="font-bold bg-blue-100">
                  <TableCell colSpan={5} className="text-right">
                    Total Amount to Pay for this Batch:
                  </TableCell>
                  <TableCell colSpan={5}>
                    <FormatNumber value={totalAmountToPay} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {form.formState.errors.payouts && (
            <p className="shad-error text-sm pt-2">
              {form.formState.errors.payouts.message ||
                form.formState.errors.payouts.root?.message}
            </p>
          )}
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="generalNotes"
          label="General Payout Notes (Optional)"
          placeholder="Add any general notes for this batch of payments"
          disabled={isProcessingCommissionPayouts}
        />

        <div className="flex justify-end gap-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              form.reset({
                payoutDate: new Date(),
                payouts: [],
                notes: "",
              })
            }
            className="shad-danger-btn"
            disabled={isProcessingCommissionPayouts}
          >
            Clear All
          </Button>
          <SubmitButton
            isLoading={isProcessingCommissionPayouts}
            className="shad-primary-btn"
            disabled={
              isProcessingCommissionPayouts || payoutFields.length === 0
            }
          >
            Process Payouts
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default PayCommissionForm;
