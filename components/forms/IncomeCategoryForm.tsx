"use client";

import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import {
  ChartOfAccountType,
  ChartOfAccountWithRelations,
  IncomeCategoryWithRelations,
} from "@/types";

import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import {
  IncomeCategoryFormValidation,
  IncomeCategoryFormValues,
} from "@/lib/validation";

interface IncomeCategoryFormProps {
  mode: "create" | "edit";
  initialData?: IncomeCategoryWithRelations;
  chartOfAccounts: ChartOfAccountWithRelations[];
}

export const IncomeCategoryForm: React.FC<IncomeCategoryFormProps> = ({
  mode,
  initialData,
  chartOfAccounts,
}) => {
  const router = useRouter();

  const {
    addIncomeCategory,
    isAddingIncomeCategory,
    updateIncomeCategory,
    isUpdatingIncomeCategory,
  } = useIncomeCategories();

  // Memoized default values
  const defaultValues = useMemo(
    () => ({
      name: initialData?.incomeCategory?.name || "",
      description: initialData?.incomeCategory?.description || "",
      chartOfAccountsId: initialData?.incomeCategory?.chartOfAccountsId || "",
    }),
    [initialData]
  );

  const form = useForm<IncomeCategoryFormValues>({
    resolver: zodResolver(IncomeCategoryFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const isAnyMutationLoading =
    isAddingIncomeCategory || isUpdatingIncomeCategory;

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
        item.account.accountType === ChartOfAccountType.REVENUE
    );
  }, [chartOfAccounts]);

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (values: IncomeCategoryFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create"
        ? "Creating Income Category..."
        : "Updating Income Category..."
    );

    try {
      if (mode === "create") {
        await addIncomeCategory(values, {
          onSuccess: () => {
            toast.success("Income Category created successfully!", {
              id: loadingToastId,
            });
            router.push("/settings/income-categories");
            router.refresh();
            form.reset(defaultValues);
          },
          onError: (error) => {
            toast.error(error.message || "Failed to create Income Category.", {
              id: loadingToastId,
            });
          },
        });
      } else if (mode === "edit" && initialData?.incomeCategory?.id) {
        await updateIncomeCategory(
          { id: initialData.incomeCategory.id, data: values },
          {
            onSuccess: () => {
              toast.success("Income Category updated successfully!", {
                id: loadingToastId,
              });
              router.push("/settings/income-categories");
              router.refresh();
            },
            onError: (error) => {
              toast.error(
                error.message || "Failed to update Income Category.",
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
            label="Link to Chart of Account (REVENUE Type)"
            placeholder="Select A Revenue account"
            disabled={isAnyMutationLoading}
            key={form.watch("chartOfAccountsId") || ""}
          >
            {flattenedAccounts
              .filter(
                (acc) => acc.account?.id !== initialData?.incomeCategory?.id
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
