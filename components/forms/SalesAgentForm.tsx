/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  SalesAgentFormValidation,
  SalesAgentFormValues,
} from "@/lib/validation";
import { SalesAgentWithRelations, User } from "@/types";
import { useSalesAgents } from "@/hooks/useSalesAgents";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { generateSalesAgentCode } from "@/lib/actions/salesAgent.actions";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SalesAgentFormProps {
  mode: "create" | "edit";
  initialData?: SalesAgentWithRelations;
  users: User[];
  generatedAgentCode?: string;
}

export const SalesAgentForm: React.FC<SalesAgentFormProps> = ({
  mode,
  initialData,
  users,
  generatedAgentCode: initialGeneratedAgentCode,
}) => {
  const [isRefetchingAgentCode, setIsRefetchingAgentCode] = useState(false);
  const router = useRouter();

  const {
    createSalesAgent,
    isCreatingSalesAgent,
    updateSalesAgent,
    isUpdatingSalesAgent,
  } = useSalesAgents();

  const defaultValues = useMemo(
    () => ({
      name: "",
      email: "",
      phone: "",
      agentCode: initialGeneratedAgentCode || "",
      userId: "",
      notes: "",
    }),
    [initialGeneratedAgentCode]
  );

  const form = useForm<SalesAgentFormValues>({
    resolver: zodResolver(SalesAgentFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const isAnyMutationLoading = isCreatingSalesAgent || isUpdatingSalesAgent;

  const handleCancel = () => {
    if (mode === "edit" && initialData) {
      form.reset({
        name: initialData?.salesAgent?.name || "",
        email: initialData?.salesAgent?.email || "",
        phone: initialData?.salesAgent?.phone || "",
        agentCode: initialData?.salesAgent?.agentCode || "",
        userId: initialData?.salesAgent?.userId || "",
        notes: initialData?.salesAgent?.notes || "",
      });
    } else {
      form.reset(defaultValues);
    }
  };

  // initialize data in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        name: initialData?.salesAgent?.name || "",
        email: initialData?.salesAgent?.email || "",
        phone: initialData?.salesAgent?.phone || "",
        agentCode: initialData?.salesAgent?.agentCode || "",
        userId: initialData?.salesAgent?.userId || "",
        notes: initialData?.salesAgent?.notes || "",
      });
    } else if (mode === "create" && initialGeneratedAgentCode) {
      if (
        form.getValues("agentCode") === "" ||
        form.getValues("agentCode") === form.formState.defaultValues?.agentCode
      ) {
        form.setValue("agentCode", initialGeneratedAgentCode);
      }
    }
  }, [initialData, mode, form, initialGeneratedAgentCode]);

  useEffect(() => {
    if (
      mode === "create" &&
      initialGeneratedAgentCode &&
      form.getValues("agentCode") === ""
    ) {
      form.setValue("agentCode", initialGeneratedAgentCode);
    }
  }, [initialGeneratedAgentCode, form, mode]);

  // Refresh button handler
  const handleRefreshAgentCode = async () => {
    if (mode === "create") {
      try {
        setIsRefetchingAgentCode(true);
        const newAgentCode = await generateSalesAgentCode();
        form.setValue("agentCode", newAgentCode);
      } catch (error) {
        console.error("Error refreshing Agent Code:", error);
        toast.error("Failed to refresh Agent Code");
      } finally {
        setIsRefetchingAgentCode(false);
      }
    }
  };

  const onSubmit = async (values: SalesAgentFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create" ? "Creating Sales Agent..." : "Updating Sales Agent..."
    );

    try {
      if (mode === "create") {
        await createSalesAgent(values, {
          onSuccess: () => {
            toast.success("Sales agent created successfully!", {
              id: loadingToastId,
            });
            router.push("/sales-agents");
            router.refresh();
            form.reset(defaultValues);
          },
          onError: (error) => {
            toast.error(error.message || "Failed to create sales agent.", {
              id: loadingToastId,
            });
          },
        });
      } else if (mode === "edit" && initialData?.salesAgent?.id) {
        await updateSalesAgent(
          { id: initialData.salesAgent.id, values },
          {
            onSuccess: () => {
              toast.success("Sales agent updated successfully!", {
                id: loadingToastId,
              });
              router.push("/sales-agents");
              router.refresh();
            },
            onError: (error: any) => {
              toast.error(error.message || "Failed to update sales agent.", {
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
          <div className="flex flex-1 flex-row gap-2 items-center">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="agentCode"
              label="Agent Code"
              placeholder="e.g., SA-001"
              disabled={isAnyMutationLoading}
            />
            {mode === "create" && (
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshAgentCode}
                className="self-end shad-primary-btn px-5"
                disabled={isRefetchingAgentCode || isAnyMutationLoading}
              >
                <RefreshCw
                  className={cn(
                    "h-5 w-5",
                    isRefetchingAgentCode && "animate-spin"
                  )}
                />
              </Button>
            )}
          </div>
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Agent Name"
            placeholder="e.g., John Doe"
            disabled={isAnyMutationLoading}
          />
        </div>
        <div className="w-full flex flex-col md:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="email"
            label="Email (Optional)"
            placeholder="e.g., john.doe@example.com"
            disabled={isAnyMutationLoading}
          />
          <CustomFormField
            fieldType={FormFieldType.PHONE_INPUT}
            control={form.control}
            name="phone"
            label="Phone Number"
            placeholder="e.g., +1234567890"
            disabled={isAnyMutationLoading}
          />
        </div>
        <CustomFormField
          fieldType={FormFieldType.SELECT}
          control={form.control}
          name="userId"
          label="Link to System User (Optional)"
          placeholder="Select a system user"
          disabled={isAnyMutationLoading}
          key={`user-${form.watch("userId") || ""}`}
        >
          {users.map((user: User) => (
            <SelectItem
              key={user.id}
              value={user.id}
              className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
            >
              {user.name} ({user.email})
            </SelectItem>
          ))}
        </CustomFormField>
        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="notes"
          label="Internal Notes (Optional)"
          placeholder="Any internal notes about this sales agent"
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
            {mode === "create" ? "Create Agent" : "Update Agent"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};
