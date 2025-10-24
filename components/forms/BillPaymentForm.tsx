/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import {
  Vendor,
  PurchaseWithRelations,
  AccountWithRelations,
  AccompanyingExpenseTypeWithRelations,
  Attachment,
  BillPaymentWithRelations,
} from "@/types";

import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { useBillPayments } from "@/hooks/useBillPayments";
import { FileUploader } from "../FileUploader";
import { RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BillPaymentFormValidation,
  BillPaymentFormValues,
} from "@/lib/validation";
import { generateBillReferenceNumber } from "@/lib/actions/bills.actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Info } from "lucide-react";
import DeleteIcon from "@mui/icons-material/Delete";

interface BillPaymentFormProps {
  mode: "create" | "edit";
  initialData?: BillPaymentWithRelations;
  vendors: Vendor[];
  outstandingPurchases: PurchaseWithRelations[];
  payingAccounts: AccountWithRelations[];
  accompanyingExpenseTypes: AccompanyingExpenseTypeWithRelations[];
  generatedBillReferenceNumber?: string;
}

export const BillPaymentForm: React.FC<BillPaymentFormProps> = ({
  mode,
  initialData,
  vendors,
  outstandingPurchases,
  payingAccounts,
  accompanyingExpenseTypes,
  generatedBillReferenceNumber,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  const { payBill, isPayingBill, updateBillPayment, isUpdatingBillPayment } =
    useBillPayments();

  const [isRefetchingReferenceNumber, setIsRefetchingReferenceNumber] =
    useState(false);

  // Memoized default values
  const defaultValues = useMemo(
    () => ({
      billReferenceNo:
        initialData?.billPayment?.billReferenceNo ||
        generatedBillReferenceNumber ||
        "",
      paymentDate: initialData?.billPayment?.paymentDate
        ? new Date(initialData.billPayment.paymentDate)
        : new Date(),
      vendorId: initialData?.billPayment?.vendorId || "",
      generalComments: initialData?.billPayment?.generalComments || "",
      attachments: initialData?.billPayment?.attachments || [],
      totalPaymentAmount:
        parseFloat(initialData?.billPayment?.totalPaymentAmount as any) || 0,
      totalAccompanyingExpenses: initialData?.accompanyingExpenses
        ? initialData.accompanyingExpenses.reduce(
            (sum, exp) => sum + parseFloat(exp.expense.amount as any),
            0
          )
        : 0,

      // Initialize useFieldArray fields
      purchasesToPay:
        initialData?.items?.map((item) => ({
          purchaseId: item.item.purchaseId,
          amountToPay: parseFloat(item.item.amountApplied as any),
          purchaseNumber: item.purchase?.purchaseNumber || "",
          totalAmount: parseFloat(item.purchase?.totalAmount as any) || 0,
          amountPaidSoFar: parseFloat(item.purchase?.amountPaid as any) || 0,
        })) || [],
      payingAccounts:
        initialData?.payingAccounts?.map((item) => ({
          payingAccountId: item.allocation.payingAccountId,
          amountPaidFromAccount: parseFloat(
            item.allocation.amountPaidFromAccount as any
          ),
          accountName: item.account?.name || "",
          currentBalance: parseFloat(item.account?.currentBalance as any) || 0,
        })) || [],
      accompanyingExpenses:
        initialData?.accompanyingExpenses?.map((item) => ({
          accompanyingExpenseTypeId: item.expense.accompanyingExpenseTypeId,
          amount: parseFloat(item.expense.amount as any),
          payee: item.expense.payee,
          comments: item.expense.comments,
          expenseTypeName: item.accompanyingType?.name || "",
        })) || [],
    }),
    [initialData, generatedBillReferenceNumber]
  );

  const form = useForm<BillPaymentFormValues>({
    resolver: zodResolver(BillPaymentFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  // --- useFieldArray hooks ---
  const {
    fields: purchasesToPayFields,
    prepend: prependPurchaseToPay,
    remove: removePurchaseToPay,
  } = useFieldArray({
    control: form.control,
    name: "purchasesToPay",
  });
  const {
    fields: payingAccountsFields,
    prepend: prependPayingAccount,
    remove: removePayingAccount,
  } = useFieldArray({
    control: form.control,
    name: "payingAccounts",
  });
  const {
    fields: accompanyingExpensesFields,
    prepend: prependAccompanyingExpense,
    remove: removeAccompanyingExpense,
  } = useFieldArray({
    control: form.control,
    name: "accompanyingExpenses",
  });

  const isAnyMutationLoading = isPayingBill || isUpdatingBillPayment;

  const selectedVendorId = form.watch("vendorId");
  const watchedPayingAccounts = form.watch("payingAccounts");
  const watchedPurchasesToPay = form.watch("purchasesToPay");
  const watchedAccompanyingExpenses = form.watch("accompanyingExpenses");

  // --- Total Calculations ---
  const calculateTotalPurchasesPaid = useCallback(() => {
    return watchedPurchasesToPay.reduce(
      (sum, item) => sum + (item.amountToPay || 0),
      0
    );
  }, [watchedPurchasesToPay]);

  const calculateTotalAccompanyingExpenses = useCallback(() => {
    return (
      watchedAccompanyingExpenses?.reduce(
        (sum, exp) => sum + (exp.amount || 0),
        0
      ) || 0
    );
  }, [watchedAccompanyingExpenses]);

  const calculateTotalPaidFromAccounts = useCallback(() => {
    return watchedPayingAccounts.reduce(
      (sum, acc) => sum + (acc.amountPaidFromAccount || 0),
      0
    );
  }, [watchedPayingAccounts]);

  const calculateGrandTotal = useCallback(() => {
    return calculateTotalPurchasesPaid() + calculateTotalAccompanyingExpenses();
  }, [calculateTotalPurchasesPaid, calculateTotalAccompanyingExpenses]);

  const getAccountBalance = useCallback(
    (accountId: string) => {
      const account = payingAccounts.find(
        (account) => account.account.id === accountId
      );
      return account?.account.currentBalance || 0;
    },
    [payingAccounts]
  );

  const entryAccountBalance = useCallback(
    (index: number) => {
      const accountId = form.getValues(
        `payingAccounts.${index}.payingAccountId`
      );
      return getAccountBalance(accountId);
    },
    [form, getAccountBalance]
  );

  // Update form totals
  useEffect(() => {
    const currentGrandTotal = calculateGrandTotal();
    const currentAccompanyingTotal = calculateTotalAccompanyingExpenses();

    if (form.getValues("totalPaymentAmount") !== currentGrandTotal) {
      form.setValue("totalPaymentAmount", currentGrandTotal, {
        shouldValidate: true,
      });
    }
    if (
      form.getValues("totalAccompanyingExpenses") !== currentAccompanyingTotal
    ) {
      form.setValue("totalAccompanyingExpenses", currentAccompanyingTotal, {
        shouldValidate: true,
      });
    }
  }, [
    watchedPurchasesToPay,
    watchedAccompanyingExpenses,
    form,
    calculateGrandTotal,
    calculateTotalAccompanyingExpenses,
  ]);

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  // Set reference number
  useEffect(() => {
    if (
      mode === "create" &&
      generatedBillReferenceNumber &&
      form.getValues("billReferenceNo") === ""
    ) {
      form.setValue("billReferenceNo", generatedBillReferenceNumber);
    }
  }, [generatedBillReferenceNumber, form, mode]);

  // Refresh button handler for reference number
  const handleRefreshRefNumber = async () => {
    if (mode === "create") {
      try {
        setIsRefetchingReferenceNumber(true);
        const newRefNumber = await generateBillReferenceNumber();
        form.setValue("billReferenceNo", newRefNumber);
      } catch (error) {
        console.error("Error refreshing bill reference number:", error);
        toast.error("Failed to refresh bill reference number");
      } finally {
        setIsRefetchingReferenceNumber(false);
      }
    }
  };

  const handleAddPurchaseToPay = (purchase: PurchaseWithRelations) => {
    // Check if already added
    if (
      purchasesToPayFields.some(
        (item) => item.purchaseId === purchase.purchase.id
      )
    ) {
      toast.error("This Purchase is already added.");
      return;
    }
    prependPurchaseToPay({
      purchaseId: purchase.purchase.id,
      amountToPay: purchase.purchase.totalAmount - purchase.purchase.amountPaid,
      purchaseNumber: purchase.purchase.purchaseNumber,
      totalAmount: purchase.purchase.totalAmount,
      amountPaidSoFar: purchase.purchase.amountPaid,
    });
  };

  const handleAddPayingAccount = () => {
    prependPayingAccount({
      payingAccountId: "",
      amountPaidFromAccount: 0,
      currentBalance: 0,
    });
  };

  const handleAddAccompanyingExpense = () => {
    prependAccompanyingExpense({
      accompanyingExpenseTypeId: "",
      amount: 0,
      payee: "",
      comments: "",
    });
  };

  const onSubmit = async (values: BillPaymentFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create"
        ? "Processing Bill Payment..."
        : "Updating Bill Payment..."
    );

    try {
      const isValid = await form.trigger();
      if (!isValid) {
        toast.error("Please correct the form errors before submitting.", {
          id: loadingToastId,
        });
        return;
      }

      // Final client-side balance check for all selected paying accounts
      for (const allocation of values.payingAccounts) {
        const availableBalance = getAccountBalance(allocation.payingAccountId);
        if (availableBalance === undefined) {
          toast.error(
            `Balance for account ${allocation.accountName} not available.`,
            { id: loadingToastId }
          );
          return;
        }
        if (allocation.amountPaidFromAccount > availableBalance) {
          toast.error(
            `Insufficient funds in selected account for amount ${allocation.amountPaidFromAccount}. Available: ${availableBalance}.`,
            { id: loadingToastId }
          );
          return;
        }
      }

      const uploadedAttachments: Attachment[] = [];
      const newFilesToUpload =
        values.attachments?.filter(
          (file: any) => typeof file !== "string" && !file.url
        ) || [];
      const existingAttachments =
        values.attachments?.filter(
          (file: any) => typeof file === "string" || file.url
        ) || [];

      const supabase = createSupabaseBrowserClient();

      if (newFilesToUpload.length > 0) {
        await Promise.all(
          newFilesToUpload.map(async (file: any) => {
            const fileId = `${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
              .from("images")
              .upload(fileId, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("images")
              .getPublicUrl(fileId);

            uploadedAttachments.push({
              id: fileId,
              url: urlData.publicUrl,
              name: file.name,
              size: file.size,
              type: file.type,
            });
          })
        );
      }

      const allAttachments = [
        ...(existingAttachments as Attachment[]),
        ...uploadedAttachments,
      ];

      const dataWithAttachments = {
        ...values,
        attachments: allAttachments,
        // The server action will re-validate and use server-side balances/totals,
        // so `totalPaymentAmount` and `totalAccompanyingExpenses` from client are not authoritative
        // but included for type consistency.
      };

      if (!user?.id) {
        toast.error("User not authenticated", { id: loadingToastId });
        return;
      }

      if (mode === "create") {
        await payBill(
          { data: dataWithAttachments, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Bill payment processed successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/billing");
              router.refresh();
              form.reset(defaultValues);
            },
            onError: (error) => {
              toast.error(error.message || "Failed to process Bill Payment.", {
                id: loadingToastId,
              });
            },
          }
        );
      } else if (mode === "edit" && initialData?.billPayment?.id) {
        const previousAttachmentIds =
          initialData.billPayment.attachments?.map((a: Attachment) => a.id) ||
          [];
        const currentAttachmentIds = allAttachments.map((a) => a.id);
        const attachmentsToDelete = previousAttachmentIds.filter(
          (id: string) => !currentAttachmentIds.includes(id)
        );

        if (attachmentsToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from("images")
            .remove(attachmentsToDelete);
          if (deleteError)
            console.warn(
              "Failed to delete old attachments during update:",
              deleteError
            );
        }

        await updateBillPayment(
          {
            id: initialData.billPayment.id,
            data: dataWithAttachments,
            userId: user.id,
          },
          {
            onSuccess: () => {
              toast.success("Bill payment updated successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/billing");
              router.refresh();
            },
            onError: (error: any) => {
              toast.error(error.message || "Failed to update Bill Payment.", {
                id: loadingToastId,
              });
            },
          }
        );
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An unexpected error occurred during submission.", {
        id: loadingToastId,
      });
    }
  };

  // Trigger validation when paying accounts amounts change
  const watchedPayingAccountsTotal = watchedPayingAccounts.reduce(
    (sum, acc) => sum + (acc.amountPaidFromAccount || 0),
    0
  );

  useEffect(() => {
    if (watchedPayingAccounts.length > 0) {
      form.trigger("payingAccounts");
    }
  }, [watchedPayingAccountsTotal, form, watchedPayingAccounts]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 text-dark-500"
      >
        {/* --- BILL PAYMENT HEADER FIELDS --- */}
        <div className="w-full flex flex-col md:flex-row gap-5">
          <div className="flex flex-1 flex-row gap-2 items-center">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="billReferenceNo"
              label="Bill Reference Number"
              placeholder="e.g., BP-2024-001"
              disabled={isAnyMutationLoading}
            />
            {mode === "create" && (
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshRefNumber}
                className="self-end shad-primary-btn px-5"
                disabled={isRefetchingReferenceNumber || isAnyMutationLoading}
              >
                <RefreshCw
                  className={cn(
                    "h-5 w-5",
                    isRefetchingReferenceNumber && "animate-spin"
                  )}
                />
              </Button>
            )}
          </div>
          <CustomFormField
            fieldType={FormFieldType.DATE_PICKER}
            control={form.control}
            name="paymentDate"
            label="Payment Date"
            dateFormat="MM/dd/yyyy"
            disabled={isAnyMutationLoading}
          />
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="vendorId"
            label="Vendor"
            placeholder="Select vendor"
            disabled={isAnyMutationLoading}
            key={`vendor-select-${form.watch("vendorId") || ""}`}
          >
            {vendors.map((vendor) => (
              <SelectItem
                key={vendor.id}
                value={vendor.id || ""}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {vendor.name}
              </SelectItem>
            ))}
          </CustomFormField>
        </div>

        {/* --- PURCHASES TO PAY SECTION --- */}
        <div
          className={cn(
            "space-y-5 p-4 rounded-lg border bg-white",
            form.formState.errors.purchasesToPay
              ? "border-red-500"
              : "border-gray-300"
          )}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-blue-800">
              Purchases to Pay
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  disabled={isAnyMutationLoading || !selectedVendorId}
                  className="shad-primary-btn flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Purchase
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 bg-white py-2" align="end">
                {outstandingPurchases
                  .filter(
                    (p) =>
                      p.vendor.id === selectedVendorId &&
                      !purchasesToPayFields.some(
                        (f) => f.purchaseId === p.purchase.id
                      )
                  )
                  .map((purchase) => (
                    <DropdownMenuItem
                      key={purchase.purchase.id}
                      onClick={() => handleAddPurchaseToPay(purchase)}
                      disabled={isAnyMutationLoading}
                      className="cursor-pointer hover:bg-blue-50"
                    >
                      {purchase.purchase.purchaseNumber} (Due:{" "}
                      <FormatNumber
                        value={
                          parseFloat(purchase.purchase.totalAmount as any) -
                          parseFloat(purchase.purchase.amountPaid as any)
                        }
                      />
                      )
                    </DropdownMenuItem>
                  ))}
                {outstandingPurchases.filter(
                  (p) =>
                    p.vendor.id === selectedVendorId &&
                    !purchasesToPayFields.some(
                      (f) => f.purchaseId === p.purchase.id
                    )
                ).length === 0 && (
                  <DropdownMenuItem disabled>
                    No outstanding purchases for this vendor.
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Table className="shad-table">
            <TableHeader className="bg-blue-800 text-white sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[5%]">#</TableHead>
                <TableHead className="w-[20%]">Purchase Number</TableHead>
                <TableHead className="w-[15%]">Total Amount</TableHead>
                <TableHead className="w-[15%]">Paid So Far</TableHead>
                <TableHead className="w-[15%]">Outstanding</TableHead>
                <TableHead className="w-[15%]">Amount to Pay</TableHead>
                <TableHead className="w-[5%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {purchasesToPayFields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No purchases selected for payment.
                  </TableCell>
                </TableRow>
              )}
              {purchasesToPayFields.map((field, index) => {
                const totalAmt = parseFloat(field.totalAmount as any) || 0;
                const paidSoFar = parseFloat(field.amountPaidSoFar as any) || 0;
                const outstanding = totalAmt - paidSoFar;
                return (
                  <TableRow
                    key={field.id}
                    className={cn("w-full", { "bg-blue-50": index % 2 === 1 })}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{field.purchaseNumber}</TableCell>
                    <TableCell>
                      <FormatNumber value={totalAmt} />
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={paidSoFar} />
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={outstanding} />
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.AMOUNT}
                        control={form.control}
                        name={`purchasesToPay.${index}.amountToPay`}
                        label=""
                        placeholder="0.00"
                        disabled={isAnyMutationLoading}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePurchaseToPay(index)}
                        disabled={isAnyMutationLoading}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <DeleteIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {purchasesToPayFields.length > 0 && (
                <TableRow className="font-semibold text-lg ">
                  <TableCell colSpan={5} className="text-right pt-4">
                    Total Amount for Purchases:
                  </TableCell>
                  <TableCell className="pt-4">
                    <FormatNumber value={calculateTotalPurchasesPaid()} />
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {form.formState.errors.purchasesToPay && (
            <p className="shad-error text-sm pt-2">
              {form.formState.errors.purchasesToPay.message}
            </p>
          )}
        </div>

        {/* --- ACCOMPANYING EXPENSES FOR PAYMENT SECTION --- */}
        <div
          className={cn(
            "space-y-5 p-4 rounded-lg border bg-white",
            form.formState.errors.accompanyingExpenses
              ? "border-red-500"
              : "border-gray-300"
          )}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-blue-800">
              Accompanying Expenses for this Payment
            </h2>
            <Button
              type="button"
              onClick={handleAddAccompanyingExpense}
              disabled={isAnyMutationLoading}
              className="shad-primary-btn flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </div>

          <Table className="shad-table">
            <TableHeader className="bg-blue-800 text-white sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[5%]">#</TableHead>
                <TableHead className="w-[25%]">Expense Type</TableHead>
                <TableHead className="w-[15%]">Amount</TableHead>
                <TableHead className="w-[20%]">Payee (Optional)</TableHead>
                <TableHead className="w-[30%]">Comments (Optional)</TableHead>
                <TableHead className="w-[5%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {accompanyingExpensesFields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No accompanying expenses added.
                  </TableCell>
                </TableRow>
              )}
              {accompanyingExpensesFields.map((field, index) => (
                <TableRow
                  key={field.id}
                  className={cn("w-full", { "bg-blue-50": index % 2 === 1 })}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={form.control}
                      name={`accompanyingExpenses.${index}.accompanyingExpenseTypeId`}
                      label=""
                      placeholder="Select type"
                      disabled={isAnyMutationLoading}
                      key={`${field.id}-acc-type-select`}
                    >
                      {accompanyingExpenseTypes.map((type) => (
                        <SelectItem
                          key={type.type.id}
                          value={type.type.id || ""}
                          className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                        >
                          {type.type.name}
                        </SelectItem>
                      ))}
                    </CustomFormField>
                  </TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.AMOUNT}
                      control={form.control}
                      name={`accompanyingExpenses.${index}.amount`}
                      label=""
                      placeholder="0.00"
                      disabled={isAnyMutationLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.INPUT}
                      control={form.control}
                      name={`accompanyingExpenses.${index}.payee`}
                      label=""
                      placeholder="e.g., Courier"
                      disabled={isAnyMutationLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.INPUT}
                      control={form.control}
                      name={`accompanyingExpenses.${index}.comments`}
                      label=""
                      placeholder="e.g., Bank charges for wire transfer"
                      disabled={isAnyMutationLoading}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAccompanyingExpense(index)}
                      disabled={isAnyMutationLoading}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <DeleteIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {accompanyingExpensesFields.length > 0 && (
                <TableRow className="font-semibold text-lg">
                  <TableCell colSpan={2} className="text-right pt-4">
                    Total Accompanying Expenses:
                  </TableCell>
                  <TableCell className="pt-4">
                    <FormatNumber
                      value={calculateTotalAccompanyingExpenses()}
                    />
                  </TableCell>
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {form.formState.errors.accompanyingExpenses && (
            <p className="shad-error text-sm pt-2">
              {form.formState.errors.accompanyingExpenses.message}
            </p>
          )}
        </div>

        {/* --- PAYING ACCOUNTS SECTION --- */}
        <div
          className={cn(
            "space-y-5 p-4 rounded-lg border bg-white",
            form.formState.errors.payingAccounts
              ? "border-red-500"
              : "border-gray-300"
          )}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-blue-800">
              Payment Allocation from Accounts
            </h2>
            <Button
              type="button"
              onClick={handleAddPayingAccount}
              disabled={isAnyMutationLoading}
              className="shad-primary-btn flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </div>

          <Table className="shad-table">
            <TableHeader className="bg-blue-800 text-white sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[5%]">#</TableHead>
                <TableHead className="w-[40%]">Account</TableHead>
                <TableHead className="w-[25%]">Available Balance</TableHead>
                <TableHead className="w-[25%]">Amount from Account</TableHead>
                <TableHead className="w-[5%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {payingAccountsFields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No accounts selected for payment.
                  </TableCell>
                </TableRow>
              )}
              {payingAccountsFields.map((field, index) => {
                const currentBalance = entryAccountBalance(index);

                const amountPaid = form.watch(
                  `payingAccounts.${index}.amountPaidFromAccount`
                );
                const availableBalance = currentBalance - (amountPaid || 0);

                const isInsufficientFunds = amountPaid > currentBalance;

                return (
                  <TableRow
                    key={field.id}
                    className={cn("w-full", { "bg-blue-50": index % 2 === 1 })}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.SELECT}
                        control={form.control}
                        name={`payingAccounts.${index}.payingAccountId`}
                        label=""
                        placeholder="Select account"
                        disabled={isAnyMutationLoading}
                        key={`${field.id}-account-select`}
                      >
                        {payingAccounts.map((account) => (
                          <SelectItem
                            key={account.account.id}
                            value={account.account.id || ""}
                            className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                          >
                            {account.account.name} (
                            {account.account.accountNumber || "N/A"})
                          </SelectItem>
                        ))}
                      </CustomFormField>
                      {form.formState.errors.payingAccounts?.[index]
                        ?.payingAccountId && (
                        <p className="shad-error text-xs pt-1">
                          {
                            form.formState.errors.payingAccounts?.[index]
                              ?.payingAccountId?.message
                          }
                        </p>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-semibold",
                        currentBalance > 0
                          ? "text-green-500"
                          : availableBalance > 0
                          ? "text-green-500"
                          : "text-red-600"
                      )}
                    >
                      <FormatNumber value={currentBalance} />
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.AMOUNT}
                        control={form.control}
                        name={`payingAccounts.${index}.amountPaidFromAccount`}
                        label=""
                        placeholder="0.00"
                        disabled={isAnyMutationLoading}
                      />
                      {isInsufficientFunds && (
                        <p className="text-red-600 text-xs pt-1">
                          Insufficient funds.
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePayingAccount(index)}
                        disabled={isAnyMutationLoading}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <DeleteIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {payingAccountsFields.length > 0 && (
                <TableRow className="font-semibold text-lg ">
                  <TableCell colSpan={3} className="text-right pt-4">
                    Total Paid from Accounts:
                  </TableCell>
                  <TableCell className="pt-4">
                    <FormatNumber
                      value={watchedPayingAccounts.reduce(
                        (sum, acc) => sum + (acc.amountPaidFromAccount || 0),
                        0
                      )}
                    />
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {form.formState.errors.payingAccounts && (
            <p className="shad-error text-sm -mt-2">
              {form.formState.errors.payingAccounts.message}
            </p>
          )}
        </div>

        {/* Total Cost Summary Section */}
        <div className="bg-blue-50 border-2 border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-4">
            Payment Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-700 font-medium">
                Total Purchased Amount:
              </span>
              <span className="font-semibold text-blue-800">
                <FormatNumber value={calculateTotalPurchasesPaid()} />
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-gray-700 font-medium">
                Total Expense Amount:
              </span>
              <span className="font-semibold text-blue-800">
                <FormatNumber value={calculateTotalAccompanyingExpenses()} />
              </span>
            </div>
            <div className="flex justify-between items-center py-3 bg-blue-800 text-white px-4 rounded-md">
              <span className="text-lg font-bold">
                Total Cost of Purchase (Grand Total):
              </span>
              <span className="text-lg font-bold">
                <FormatNumber value={calculateGrandTotal()} />
              </span>
            </div>

            <div className="mt-4 pt-4 border-t-2 border-blue-300">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700 font-medium">
                  Total Paid from Accounts:
                </span>
                <span
                  className={`text-lg font-semibold ${
                    calculateTotalPaidFromAccounts() === calculateGrandTotal()
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  <FormatNumber value={calculateTotalPaidFromAccounts()} />
                </span>
              </div>
              {calculateTotalPaidFromAccounts() !== calculateGrandTotal() && (
                <div className="flex items-start gap-2 mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                  <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    <strong>Balance Mismatch:</strong> Total paid from accounts
                    must equal the grand total.
                    {calculateTotalPaidFromAccounts() < calculateGrandTotal()
                      ? ` You need to allocate ${(
                          <FormatNumber
                            value={
                              calculateGrandTotal() -
                              calculateTotalPaidFromAccounts()
                            }
                          />
                        )} more.`
                      : ` You have allocated ${(
                          <FormatNumber
                            value={
                              calculateTotalPaidFromAccounts() -
                              calculateGrandTotal()
                            }
                          />
                        )} too much.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="generalComments"
          label="General Comments (Optional)"
          placeholder="Any overall comments for this bill payment"
          disabled={isAnyMutationLoading}
        />

        <CustomFormField
          fieldType={FormFieldType.SKELETON}
          control={form.control}
          name="attachments"
          label="Attachments (Optional)"
          renderSkeleton={(field) => (
            <FormControl>
              <FileUploader
                files={field.value}
                onChange={field.onChange}
                mode={mode}
                accept={{
                  "application/pdf": [".pdf"],
                  "image/*": [".png", ".jpg", ".jpeg", ".gif"],
                }}
                maxFiles={5}
                disabled={isAnyMutationLoading}
              />
            </FormControl>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={handleCancel}
            className="shad-danger-btn"
            disabled={isAnyMutationLoading}
          >
            Cancel
          </Button>
          <SubmitButton
            isLoading={isAnyMutationLoading}
            className="shad-primary-btn"
            disabled={isAnyMutationLoading}
          >
            {mode === "create" ? "Process Bill Payment" : "Update Bill Payment"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};
