/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import { ExpenseFormValidation, ExpenseFormValues } from "@/lib/validation";
import {
  ExpenseCategoryWithRelations,
  AccountWithRelations,
  AccompanyingExpenseTypeWithRelations,
  PurchaseWithRelations,
  Attachment,
  ExpenseWithRelations,
} from "@/types";

import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { useExpenses } from "@/hooks/useExpenses";
import { FileUploader } from "../FileUploader";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateExpenseReferenceNumber } from "@/lib/actions/expense.actions";

interface ExpenseFormProps {
  mode: "create" | "edit";
  initialData?: ExpenseWithRelations;
  expenseCategories: ExpenseCategoryWithRelations[];
  payingAccounts: AccountWithRelations[];
  accompanyingExpenseTypes: AccompanyingExpenseTypeWithRelations[];
  purchases: PurchaseWithRelations[];
  generatedReferenceNumber?: string;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  mode,
  initialData,
  expenseCategories,
  payingAccounts,
  accompanyingExpenseTypes,
  purchases,
  generatedReferenceNumber,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  const { addExpense, isAddingExpense, updateExpense, isUpdatingExpense } =
    useExpenses();

  const [isRefetchingReferenceNumber, setIsRefetchingReferenceNumber] =
    useState(false);

  // Memoized default values
  const defaultValues = useMemo(
    () => ({
      title: initialData?.expense?.title || "",
      description: initialData?.expense?.description || "",
      amount: parseFloat(initialData?.expense?.amount as any) || 0,
      expenseDate: initialData?.expense?.expenseDate
        ? new Date(initialData.expense.expenseDate)
        : new Date(),
      expenseCategoryId: initialData?.expense?.expenseCategoryId || "",
      payingAccountId: initialData?.expense?.payingAccountId || "",
      referenceNumber:
        initialData?.expense?.referenceNumber || generatedReferenceNumber || "",
      payee: initialData?.expense?.payee || "",
      notes: initialData?.expense?.notes || "",
      attachments: initialData?.expense?.attachments || [],
      isAccompanyingExpense:
        initialData?.expense?.isAccompanyingExpense || false,
      purchaseId: initialData?.expense?.purchaseId || "",
      accompanyingExpenseTypeId:
        initialData?.expense?.accompanyingExpenseTypeId || "",
      currentPayingAccountBalance: initialData?.payingAccount?.currentBalance
        ? parseFloat(initialData.payingAccount.currentBalance as any)
        : undefined,
    }),
    [initialData, generatedReferenceNumber]
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const isAnyMutationLoading = isAddingExpense || isUpdatingExpense;

  const selectedPayingAccountId = form.watch("payingAccountId");
  const isAccompanyingExpense = form.watch("isAccompanyingExpense");
  const currentPayingAccountBalance = form.watch("currentPayingAccountBalance");

  useEffect(() => {
    if (!selectedPayingAccountId) {
      form.setValue("currentPayingAccountBalance", undefined, {
        shouldValidate: true,
      });
      return;
    }

    const account = payingAccounts.find(
      (acc) => acc.account.id === selectedPayingAccountId
    );

    if (account) {
      const newBalance = parseFloat(account.account.currentBalance as any) || 0;
      form.setValue("currentPayingAccountBalance", newBalance, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      form.setValue("currentPayingAccountBalance", undefined, {
        shouldValidate: true,
      });
    }
  }, [selectedPayingAccountId, payingAccounts, form]);

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  // set reference number
  useEffect(() => {
    if (
      mode === "create" &&
      generatedReferenceNumber &&
      form.getValues("referenceNumber") === ""
    ) {
      form.setValue("referenceNumber", generatedReferenceNumber);
    }
  }, [generatedReferenceNumber, form, mode]);

  // Refresh button handler
  const handleRefreshReferenceNumber = async () => {
    if (mode === "create") {
      try {
        setIsRefetchingReferenceNumber(true);
        const newRefNumber = await generateExpenseReferenceNumber();
        form.setValue("referenceNumber", newRefNumber);
      } catch (error) {
        console.error("Error refreshing reference number:", error);
        toast.error("Failed to refresh reference number");
      } finally {
        setIsRefetchingReferenceNumber(false);
      }
    }
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create" ? "Creating Expense..." : "Updating Expense..."
    );

    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Please correct the form errors.", { id: loadingToastId });
      return;
    }

    try {
      // Handle file uploads
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
      };

      if (!user?.id) {
        toast.error("User not authenticated");
        return;
      }
      if (mode === "create") {
        await addExpense(
          { data: dataWithAttachments, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Expense created successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/expenses");
              router.refresh();
              form.reset(defaultValues);
            },
            onError: (error) => {
              toast.error(error.message || "Failed to create Expense.", {
                id: loadingToastId,
              });
            },
          }
        );
      } else if (mode === "edit" && initialData?.expense?.id) {
        // For edit, determine which attachments to delete if they were removed from the form
        const previousAttachmentIds =
          initialData.expense.attachments?.map((a: Attachment) => a.id) || [];
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

        await updateExpense(
          {
            id: initialData.expense.id,
            data: dataWithAttachments,
            userId: user.id,
          },
          {
            onSuccess: () => {
              toast.success("Expense updated successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/expenses");
              router.refresh();
            },
            onError: (error: any) => {
              toast.error(error.message || "Failed to update Expense.", {
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 text-dark-500"
      >
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="title"
          label="Expense Title"
          placeholder="e.g., Monthly Electricity Bill"
          disabled={isAnyMutationLoading}
        />
        <div className="w-full flex flex-col md:flex-row gap-5">
          <div className="flex flex-1 flex-row gap-2 items-center">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="referenceNumber"
              label="Reference Number"
              placeholder="e.g., INV-001, TRN-5678"
              disabled={isAnyMutationLoading}
            />
            {mode === "create" && (
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshReferenceNumber}
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
            name="expenseDate"
            label="Expense Date"
            dateFormat="MM/dd/yyyy"
            disabled={isAnyMutationLoading}
          />
        </div>

        <div className="w-full flex flex-col md:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="expenseCategoryId"
            label="Expense Category"
            placeholder="Select expense category"
            disabled={isAnyMutationLoading}
            key={form.watch("expenseCategoryId") || ""}
          >
            {expenseCategories.map((cat) => (
              <SelectItem
                key={cat.expenseCategory.id}
                value={cat.expenseCategory.id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {cat.expenseCategory.name}
              </SelectItem>
            ))}
          </CustomFormField>

          <div className="flex flex-1 flex-col gap-2">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="payingAccountId"
              label="Paying Account (Source of Funds)"
              placeholder="Select paying account"
              disabled={isAnyMutationLoading}
              key={form.watch("payingAccountId") || ""}
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
            {selectedPayingAccountId && (
              <p
                className={cn(
                  "text-sm pl-2",
                  currentPayingAccountBalance && currentPayingAccountBalance > 0
                    ? "text-green-500"
                    : "text-red-600",
                  form.watch("amount") > (currentPayingAccountBalance || 0) &&
                    "text-red-600"
                )}
              >
                Current Balance:{" "}
                <span className="font-semibold">
                  <FormatNumber value={currentPayingAccountBalance || 0} />
                </span>
              </p>
            )}
            <input
              type="hidden"
              {...form.register("currentPayingAccountBalance", {
                valueAsNumber: true,
              })}
            />
          </div>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.AMOUNT}
            control={form.control}
            name="amount"
            label="Amount"
            placeholder="0.00"
            disabled={isAnyMutationLoading}
          />
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="payee"
            label="Payee (Who was paid?)"
            placeholder="e.g., Liberia Electricity Corporation, John Doe"
            disabled={isAnyMutationLoading}
          />
        </div>

        <CustomFormField
          fieldType={FormFieldType.SWITCH}
          control={form.control}
          name="isAccompanyingExpense"
          label="Is this an Accompanying Expense for a Purchase ?"
          disabled={isAnyMutationLoading}
        />

        {isAccompanyingExpense && (
          <div className="w-full flex flex-col md:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="purchaseId"
              label="Linked Purchase Order"
              placeholder="Select a purchase order"
              disabled={isAnyMutationLoading}
            >
              {purchases.map((purchase) => (
                <SelectItem
                  key={purchase.purchase.id}
                  value={purchase.purchase.id || ""}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                >
                  {purchase.purchase.purchaseNumber} - {purchase.vendor.name}
                </SelectItem>
              ))}
            </CustomFormField>
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="accompanyingExpenseTypeId"
              label="Accompanying Expense Type"
              placeholder="Select type"
              disabled={isAnyMutationLoading}
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
          </div>
        )}

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="description"
          label="Description"
          placeholder="Brief description of the expense"
          disabled={isAnyMutationLoading}
        />
        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="notes"
          label="Internal Notes (Optional)"
          placeholder="Any internal notes or comments"
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
            {mode === "create" ? "Create Expense" : "Update Expense"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};
