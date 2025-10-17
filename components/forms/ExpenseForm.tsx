/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import {
  ExpenseFormValidation,
  ExpenseFormValues,
  ExpenseItemFormValues,
} from "@/lib/validation";
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
import DeleteIcon from "@mui/icons-material/Delete";
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

  const defaultValues = useMemo(
    () => ({
      amount: parseFloat(initialData?.expense?.amount as any) || 0,
      expenseDate: initialData?.expense?.expenseDate
        ? new Date(initialData.expense.expenseDate)
        : new Date(),
      payingAccountId: initialData?.expense?.payingAccountId || "",
      referenceNumber:
        initialData?.expense?.referenceNumber || generatedReferenceNumber || "",
      notes: initialData?.expense?.notes || "",
      attachments: initialData?.expense?.attachments || [],
      // Initialize currentPayingAccountBalance in RHF state directly from initialData
      currentPayingAccountBalance: initialData?.payingAccount?.currentBalance
        ? parseFloat(initialData.payingAccount.currentBalance as any)
        : undefined,
      // NEW: Initialize items array
      items:
        initialData?.items?.map((item) => ({
          id: item.expenseItem.id,
          title: item.expenseItem.title,
          itemAmount: parseFloat(item.expenseItem.itemAmount as any),
          expenseCategoryId: item.expenseItem.expenseCategoryId,
          payee: item.expenseItem.payee,
          notes: item.expenseItem.notes,
          isAccompanyingExpense: item.expenseItem.isAccompanyingExpense,
          purchaseId: item.expenseItem.purchaseId,
          accompanyingExpenseTypeId: item.expenseItem.accompanyingExpenseTypeId,
        })) || [],

      originalAmount:
        mode === "edit"
          ? parseFloat(initialData?.expense?.amount as any) || 0
          : undefined,
      isEditMode: mode === "edit",
    }),
    [initialData, generatedReferenceNumber, mode]
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const isAnyMutationLoading = isAddingExpense || isUpdatingExpense;

  const selectedPayingAccountId = form.watch("payingAccountId");
  const currentPayingAccountBalance = form.watch("currentPayingAccountBalance");
  const itemAmounts = fields.map((_, index) =>
    form.watch(`items.${index}.itemAmount`)
  );

  // --- REVISED useEffect to update FORM STATE for currentPayingAccountBalance ---
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

  // --- NEW: Recalculate total amount when line items change ---
  const calculateOverallTotalAmount = useCallback(() => {
    let total = 0;
    const items = form.getValues("items");
    items.forEach((item) => {
      total += parseFloat(item.itemAmount as any) || 0;
    });
    return total;
  }, [form]);

  useEffect(() => {
    const newOverallTotal = calculateOverallTotalAmount();
    const currentAmount = form.getValues("amount");

    // Only update if the calculated total is different from current amount
    if (currentAmount !== newOverallTotal) {
      form.setValue("amount", newOverallTotal, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [itemAmounts, fields.length, calculateOverallTotalAmount, form]);

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  useEffect(() => {
    if (
      mode === "create" &&
      generatedReferenceNumber &&
      form.getValues("referenceNumber") === ""
    ) {
      form.setValue("referenceNumber", generatedReferenceNumber);
    }
  }, [generatedReferenceNumber, form, mode]);

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

  const handleAddLineItem = () => {
    append({
      title: "",
      itemAmount: 0,
      expenseCategoryId: "",
      payee: "",
      notes: "",
      isAccompanyingExpense: false,
      purchaseId: "",
      accompanyingExpenseTypeId: "",
    } as ExpenseItemFormValues);
  };

  const handleDeleteLineItem = (index: number) => {
    remove(index);
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create"
        ? "Creating Expense Report..."
        : "Updating Expense Report..."
    );

    try {
      const isValid = await form.trigger(); // Trigger full validation explicitly
      if (!isValid) {
        toast.error("Please correct the form errors before submitting.", {
          id: loadingToastId,
        });
        return;
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
        currentPayingAccountBalance: undefined,
        originalAmount: undefined,
      };

      if (!user?.id) {
        toast.error("User not authenticated", { id: loadingToastId });
        return;
      }

      if (mode === "create") {
        await addExpense(
          { data: dataWithAttachments, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Expense report created successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/expenses");
              router.refresh();
              form.reset(defaultValues);
            },
            onError: (error) => {
              toast.error(error.message || "Failed to create Expense report.", {
                id: loadingToastId,
              });
            },
          }
        );
      } else if (mode === "edit" && initialData?.expense?.id) {
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
              toast.success("Expense report updated successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/expenses");
              router.refresh();
            },
            onError: (error: any) => {
              toast.error(error.message || "Failed to update Expense report.", {
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
        <div className="w-full flex flex-col md:flex-row gap-5">
          <div className="flex flex-1 flex-row gap-2 items-center">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="referenceNumber"
              label="Reference Number"
              placeholder="e.g., ER-2024-001"
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
            label="Expense Report Date"
            dateFormat="MM/dd/yyyy"
            disabled={isAnyMutationLoading}
          />
        </div>

        <div className="w-full flex flex-col md:flex-row gap-5">
          {/* Main Paying Account */}
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
            {/* Current Balance Display */}
            {selectedPayingAccountId && (
              <p
                className={cn(
                  "text-sm pl-2",
                  currentPayingAccountBalance && currentPayingAccountBalance > 0
                    ? "text-green-500"
                    : "text-red-600"
                )}
              >
                Current Balance:{" "}
                <span className="font-semibold">
                  <FormatNumber value={currentPayingAccountBalance || 0} />
                </span>
                {form.formState.errors.payingAccountId?.message && (
                  <span className="ml-2 text-red-600">
                    ({form.formState.errors.payingAccountId.message})
                  </span>
                )}
              </p>
            )}
            {/* Hidden input field for Zod to use for cross-field validation */}
            <input
              type="hidden"
              {...form.register("currentPayingAccountBalance", {
                valueAsNumber: true,
              })}
            />
          </div>
          {/* Total Amount for the Report */}
          <div className="flex flex-1 flex-col gap-2">
            <CustomFormField
              fieldType={FormFieldType.AMOUNT}
              control={form.control}
              name="amount"
              label="Total Expense Amount"
              placeholder="0.00"
              disabled={true}
            />
          </div>
        </div>

        {/* --- EXPENSE LINE ITEMS SECTION --- */}
        <div
          className={cn(
            "space-y-5 p-4 rounded-md border",
            form.formState.errors.items ? "border-red-500" : "border-gray-300"
          )}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-blue-800">
              Expense Line Items
            </h2>
            <Button
              type="button"
              onClick={handleAddLineItem}
              disabled={isAnyMutationLoading}
              className="shad-primary-btn flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>

          <Table className="shad-table">
            <TableHeader className="bg-blue-800 text-white sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[2%] text-center">#</TableHead>
                <TableHead className="w-[20%]">Title</TableHead>
                <TableHead className="w-[10%]">Amount</TableHead>
                <TableHead className="w-[18%]">Category</TableHead>
                <TableHead className="w-[17%]">Payee</TableHead>
                <TableHead className="w-[8%]">Accompanying?</TableHead>
                <TableHead className="w-[10%]">Linked Purchase</TableHead>
                <TableHead className="w-[10%]">Acc. Type</TableHead>
                <TableHead className="w-[5%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {fields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-4">
                    {` No expense items added. Click "Add Item" to start.`}
                  </TableCell>
                </TableRow>
              )}
              {fields.map((field, index) => (
                <TableRow
                  key={field.id}
                  className={cn("w-full", { "bg-blue-50": index % 2 === 1 })}
                >
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.INPUT}
                      control={form.control}
                      name={`items.${index}.title`}
                      label=""
                      placeholder="e.g., Office paper"
                      disabled={isAnyMutationLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.AMOUNT}
                      control={form.control}
                      name={`items.${index}.itemAmount`}
                      label=""
                      placeholder="0.00"
                      disabled={isAnyMutationLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={form.control}
                      name={`items.${index}.expenseCategoryId`}
                      label=""
                      placeholder="Select category"
                      disabled={isAnyMutationLoading}
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
                    <CustomFormField
                      fieldType={FormFieldType.INPUT}
                      control={form.control}
                      name={`items.${index}.payee`}
                      label=""
                      placeholder="e.g., Office Depot"
                      disabled={isAnyMutationLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.SWITCH}
                      control={form.control}
                      name={`items.${index}.isAccompanyingExpense`}
                      label=""
                      disabled={isAnyMutationLoading}
                    />
                  </TableCell>
                  {/* Conditional fields for Accompanying Expense */}
                  {form.watch(`items.${index}.isAccompanyingExpense`) ? (
                    <>
                      <TableCell>
                        <CustomFormField
                          fieldType={FormFieldType.SELECT}
                          control={form.control}
                          name={`items.${index}.purchaseId`}
                          label=""
                          placeholder="Select purchase"
                          disabled={isAnyMutationLoading}
                        >
                          {purchases.map((purchase) => (
                            <SelectItem
                              key={purchase.purchase.id}
                              value={purchase.purchase.id || ""}
                              className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                            >
                              {purchase.purchase.purchaseNumber} -{" "}
                              {purchase.vendor.name}
                            </SelectItem>
                          ))}
                        </CustomFormField>
                      </TableCell>
                      <TableCell>
                        <CustomFormField
                          fieldType={FormFieldType.SELECT}
                          control={form.control}
                          name={`items.${index}.accompanyingExpenseTypeId`}
                          label=""
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
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{"-"}</TableCell> {/* Placeholder */}
                      <TableCell>{"-"}</TableCell> {/* Placeholder */}
                    </>
                  )}
                  <TableCell>
                    <div className="flex flex-row items-center">
                      <span
                        onClick={() => {
                          if (!isAnyMutationLoading)
                            handleDeleteLineItem(index);
                        }}
                        className={cn(
                          "p-1 cursor-pointer",
                          isAnyMutationLoading
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-600 hover:bg-light-200 hover:rounded-md"
                        )}
                      >
                        <DeleteIcon className="h-5 w-5" />
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {form.formState.errors.items && (
            <p className="shad-error text-sm pt-2">
              {form.formState.errors.items.message}
            </p>
          )}
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="notes"
          label="Internal Notes (Optional)"
          placeholder="Any internal notes or comments for the entire report"
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
            {mode === "create"
              ? "Create Expense Report"
              : "Update Expense Report"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};
