"use client";

import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import {
  ChartOfAccountType,
  ChartOfAccountWithRelations,
  ExpenseCategoryWithRelations,
} from "@/types";

import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import {
  ExpenseCategoryFormValidation,
  ExpenseCategoryFormValues,
} from "@/lib/validation";

interface ExpenseCategoryFormProps {
  mode: "create" | "edit";
  initialData?: ExpenseCategoryWithRelations;
  chartOfAccounts: ChartOfAccountWithRelations[];
}

export const ExpenseCategoryForm: React.FC<ExpenseCategoryFormProps> = ({
  mode,
  initialData,
  chartOfAccounts,
}) => {
  const router = useRouter();

  const {
    addExpenseCategory,
    isAddingExpenseCategory,
    updateExpenseCategory,
    isUpdatingExpenseCategory,
  } = useExpenseCategories();

  // Memoized default values
  const defaultValues = useMemo(
    () => ({
      name: initialData?.expenseCategory?.name || "",
      description: initialData?.expenseCategory?.description || "",
      chartOfAccountsId: initialData?.expenseCategory?.chartOfAccountsId || "",
    }),
    [initialData]
  );

  const form = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(ExpenseCategoryFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const isAnyMutationLoading =
    isAddingExpenseCategory || isUpdatingExpenseCategory;

  // Flatten the tree for list view or client-side search, while maintaining depth info
  const flattenedAccounts = useMemo(() => {
    const flatten = (
      nodes: ChartOfAccountWithRelations[],
      depth = 0,
      prefix = ""
    ): (ChartOfAccountWithRelations & {
      depth: number;
      displayPrefix: string;
    })[] => {
      let result: (ChartOfAccountWithRelations & {
        depth: number;
        displayPrefix: string;
      })[] = [];
      nodes.forEach((node) => {
        const currentPrefix = prefix
          ? `${prefix} / ${node.account.accountName}`
          : node.account.accountName;
        result.push({ ...node, depth, displayPrefix: currentPrefix });
        if (node.children && node.children.length > 0) {
          result = result.concat(
            flatten(node.children, depth + 1, currentPrefix)
          );
        }
      });
      return result;
    };
    return flatten(chartOfAccounts).filter(
      (item: ChartOfAccountWithRelations) =>
        item.account.isActive &&
        item.account.accountType === ChartOfAccountType.EXPENSE
    );
  }, [chartOfAccounts]);

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (values: ExpenseCategoryFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create"
        ? "Creating Expense Category..."
        : "Updating Expense Category..."
    );

    try {
      if (mode === "create") {
        await addExpenseCategory(values, {
          onSuccess: () => {
            toast.success("Expense Category created successfully!", {
              id: loadingToastId,
            });
            router.push("/settings/expense-categories");
            router.refresh();
            form.reset(defaultValues);
          },
          onError: (error) => {
            toast.error(error.message || "Failed to create Expense Category.", {
              id: loadingToastId,
            });
          },
        });
      } else if (mode === "edit" && initialData?.expenseCategory?.id) {
        await updateExpenseCategory(
          { id: initialData.expenseCategory.id, data: values },
          {
            onSuccess: () => {
              toast.success("Expense Category updated successfully!", {
                id: loadingToastId,
              });
              router.push("/settings/expense-categories");
              router.refresh();
            },
            onError: (error) => {
              toast.error(
                error.message || "Failed to update Expense Category.",
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
            label="Category Name"
            placeholder="e.g., Office Supplies, Electricity"
            disabled={isAnyMutationLoading}
          />
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="chartOfAccountsId"
            label="Link to Chart of Account (Expense/COGS Type)"
            placeholder="Select an Expense or COGS account"
            disabled={isAnyMutationLoading}
            key={form.watch("chartOfAccountsId") || ""}
          >
            {flattenedAccounts
              .filter(
                (acc) => acc.account?.id !== initialData?.expenseCategory?.id
              )
              .map((coaItem) => (
                <SelectItem
                  key={coaItem.account.id}
                  value={coaItem.account.id}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                  style={{ paddingLeft: `${coaItem.depth * 20}px` }}
                >
                  {coaItem.account.accountName}
                </SelectItem>
              ))}
          </CustomFormField>
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="description"
          label="Description (Optional)"
          placeholder="Enter a brief description of the category"
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
            {mode === "create" ? "Create Category" : "Update Category"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};
