"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ChartOfAccountType, ChartOfAccountWithRelations } from "@/types";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import {
  ChartOfAccountFormValidation,
  ChartOfAccountFormValues,
} from "@/lib/validation";

interface ChartOfAccountFormProps {
  mode: "create" | "edit";
  initialData?: ChartOfAccountWithRelations;
  parentAccounts: ChartOfAccountWithRelations[];
}

const ChartOfAccountForm = ({
  mode,
  initialData,
  parentAccounts,
}: ChartOfAccountFormProps) => {
  const router = useRouter();

  const {
    addChartOfAccount,
    isAddingChartOfAccount,
    updateChartOfAccount,
    isUpdatingChartOfAccount,
  } = useChartOfAccounts();

  const defaultValues = useMemo(
    () => ({
      accountName: initialData?.account?.accountName || "",
      accountType:
        initialData?.account?.accountType ??
        (ChartOfAccountType.REVENUE as ChartOfAccountType),
      description: initialData?.account?.description || "",
      parentId: initialData?.account?.parentId || "",
      isControlAccount: initialData?.account?.isControlAccount || false,
      isDefault: initialData?.account?.isDefault || false,
    }),
    [initialData]
  );

  const form = useForm<ChartOfAccountFormValues>({
    resolver: zodResolver(ChartOfAccountFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

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
    return flatten(parentAccounts);
  }, [parentAccounts]);

  const isAnyMutationLoading =
    isAddingChartOfAccount || isUpdatingChartOfAccount;

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (values: ChartOfAccountFormValues) => {
    // Show a loading toast immediately
    const loadingToastId = toast.loading(
      mode === "create"
        ? "Creating Chart of Account..."
        : "Updating Chart of Account..."
    );

    const formValues = {
      ...values,
      parentId: values.parentId || null,
    };

    try {
      if (mode === "create") {
        await addChartOfAccount(formValues, {
          onSuccess: () => {
            toast.success("Chart of Account created successfully!", {
              id: loadingToastId,
            });
            router.refresh();
            form.reset(defaultValues);
          },
          onError: (error) => {
            toast.error(error.message || "Failed to create Chart of Account.", {
              id: loadingToastId,
            });
          },
        });
      } else if (mode === "edit" && initialData?.account?.id) {
        await updateChartOfAccount(
          { id: initialData.account.id, data: formValues },
          {
            onSuccess: () => {
              toast.success("Chart of Account updated successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/chart-of-accounts");
              router.refresh();
            },
            onError: (error) => {
              toast.error(
                error.message || "Failed to update Chart of Account.",
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
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="accountName"
          label="Account Name"
          placeholder="e.g., Cash at Bank, Utilities Expense"
          disabled={isAnyMutationLoading}
        />
        <div className="w-full flex flex-col md:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="accountType"
            label="Account Type"
            placeholder="Select an account type"
            disabled={isAnyMutationLoading}
            key={form.watch("accountType") || ""}
          >
            {Object.values(ChartOfAccountType).map((type) => (
              <SelectItem
                key={type}
                value={type}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
              >
                {type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </CustomFormField>

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="parentId"
            label="Parent Account (Optional)"
            placeholder="Select a parent account"
            disabled={isAnyMutationLoading}
            key={form.watch("parentId") || ""}
          >
            {flattenedAccounts
              .filter((acc) => acc.account?.id !== initialData?.account?.id)
              .map((parentAcc) => (
                <SelectItem
                  key={parentAcc.account?.id}
                  value={parentAcc.account?.id || ""}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                  style={{ paddingLeft: `${parentAcc.depth * 20}px` }}
                >
                  {parentAcc.account?.accountName}
                </SelectItem>
              ))}
          </CustomFormField>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-5 sm:max-w-lg">
          <CustomFormField
            fieldType={FormFieldType.SWITCH}
            control={form.control}
            name="isControlAccount"
            label="Is Control Account?"
            disabled={isAnyMutationLoading}
          />
          <CustomFormField
            fieldType={FormFieldType.SWITCH}
            control={form.control}
            name="isDefault"
            label="Is Default Account?"
            disabled={isAnyMutationLoading}
          />
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="description"
          label="Description (Optional)"
          placeholder="Enter a brief description of the account"
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
            {mode === "create" ? "Create Account" : "Update Account"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default ChartOfAccountForm;
