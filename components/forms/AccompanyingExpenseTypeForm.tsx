"use client";

import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import {
  AccompanyingExpenseTypeWithRelations,
  ExpenseCategoryWithRelations,
} from "@/types";

import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { useAccompanyingExpenseTypes } from "@/hooks/useAccompanyingExpenseTypes";
import {
  AccompanyingExpenseTypeFormValidation,
  AccompanyingExpenseTypeFormValues,
} from "@/lib/validation";

interface AccompanyingExpenseTypeFormProps {
  mode: "create" | "edit";
  initialData?: AccompanyingExpenseTypeWithRelations;
  expenseCategories: ExpenseCategoryWithRelations[];
}

export const AccompanyingExpenseTypeForm: React.FC<
  AccompanyingExpenseTypeFormProps
> = ({ mode, initialData, expenseCategories }) => {
  const router = useRouter();

  const {
    addAccompanyingExpenseType,
    isAddingAccompanyingExpenseType,
    updateAccompanyingExpenseType,
    isUpdatingAccompanyingExpenseType,
  } = useAccompanyingExpenseTypes();

  // Memoized default values
  const defaultValues = useMemo(
    () => ({
      name: initialData?.type?.name || "",
      description: initialData?.type?.description || "",
      defaultExpenseCategoryId:
        initialData?.type?.defaultExpenseCategoryId || "",
    }),
    [initialData]
  );

  const form = useForm<AccompanyingExpenseTypeFormValues>({
    resolver: zodResolver(AccompanyingExpenseTypeFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const isAnyMutationLoading =
    isAddingAccompanyingExpenseType || isUpdatingAccompanyingExpenseType;

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (values: AccompanyingExpenseTypeFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create"
        ? "Creating Accompanying Expense Type..."
        : "Updating Accompanying Expense Type..."
    );

    try {
      if (mode === "create") {
        await addAccompanyingExpenseType(values, {
          onSuccess: () => {
            toast.success("Accompanying Expense Type created successfully!", {
              id: loadingToastId,
            });
            router.push("/settings/accompanying-expense-types");
            router.refresh();
            form.reset(defaultValues);
          },
          onError: (error) => {
            toast.error(
              error.message || "Failed to create Accompanying Expense Type.",
              { id: loadingToastId }
            );
          },
        });
      } else if (mode === "edit" && initialData?.type?.id) {
        await updateAccompanyingExpenseType(
          { id: initialData.type.id, data: values },
          {
            onSuccess: () => {
              toast.success("Accompanying Expense Type updated successfully!", {
                id: loadingToastId,
              });
              router.push("/settings/accompanying-expense-types");
              router.refresh();
            },
            onError: (error) => {
              toast.error(
                error.message || "Failed to update Accompanying Expense Type.",
                { id: loadingToastId }
              );
            },
          }
        );
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An unexpected error occurred during submission.", {
        id: loadingToastId,
      });
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 text-dark-500"
      >
        <div className="w-full flex flex-col md:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Type Name"
            placeholder="e.g., Ocean Freight, Customs Duty"
            disabled={isAnyMutationLoading}
          />
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="defaultExpenseCategoryId"
            label="Default Expense Category"
            placeholder="Select an expense category"
            disabled={isAnyMutationLoading}
            key={form.watch("defaultExpenseCategoryId") || ""}
          >
            {expenseCategories.map((expenseCat) => (
              <SelectItem
                key={expenseCat.expenseCategory.id}
                value={expenseCat.expenseCategory.id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {expenseCat.expenseCategory.name}
              </SelectItem>
            ))}
          </CustomFormField>
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="description"
          label="Description (Optional)"
          placeholder="Enter a brief description of the type"
          disabled={isAnyMutationLoading}
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
            {mode === "create" ? "Create Type" : "Update Type"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};
