/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import { IncomeFormValidation, IncomeFormValues } from "@/lib/validation";
import {
  Customer,
  SaleWithRelations,
  IncomeCategoryWithRelations,
  AccountWithRelations,
  Attachment,
  IncomeWithRelations,
  PaymentMethod,
  AccountType,
} from "@/types";

import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { useIncome } from "@/hooks/useIncome";
import { FileUploader } from "../FileUploader";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generatePaymentReferenceNumber } from "@/lib/actions/payments.actions";

interface RecordIncomeFormProps {
  mode: "create" | "edit";
  initialData?: IncomeWithRelations;
  customers: Customer[];
  sales: SaleWithRelations[];
  incomeCategories: IncomeCategoryWithRelations[];
  receivingAccounts: AccountWithRelations[];
  generatedReferenceNumber?: string;
}

// Helper function to map account type to payment method
const getPaymentMethodFromAccountType = (
  accountType: AccountType
): PaymentMethod => {
  switch (accountType) {
    case AccountType.BANK:
      return PaymentMethod.Bank;
    case AccountType.MOBILE_MONEY:
      return PaymentMethod.Mobile_Money;
    case AccountType.CASH_ON_HAND:
      return PaymentMethod.Cash;
    default:
      return PaymentMethod.Cash;
  }
};

export const RecordIncomeForm: React.FC<RecordIncomeFormProps> = ({
  mode,
  initialData,
  customers,
  sales,
  incomeCategories,
  receivingAccounts,
  generatedReferenceNumber: initialGeneratedReferenceNumber,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  const { recordIncome, isRecordingIncome, updateIncome, isUpdatingIncome } =
    useIncome();

  const [isRefetchingReferenceNumber, setIsRefetchingReferenceNumber] =
    useState(false);
  const [
    displayedCurrentReceivingAccountBalance,
    setDisplayedCurrentReceivingAccountBalance,
  ] = useState<number | null>(null);

  const [incomeTypeTab, setIncomeTypeTab] = useState<
    "sales_payment" | "other_income"
  >(initialData?.payment?.saleId ? "sales_payment" : "other_income");

  const defaultValues = useMemo(
    () => ({
      paymentRefNumber:
        initialData?.payment?.paymentRefNumber ||
        initialGeneratedReferenceNumber ||
        "",
      paymentDate: initialData?.payment?.paymentDate
        ? new Date(initialData.payment.paymentDate)
        : new Date(),
      customerId: initialData?.payment?.customerId || "",
      saleId: initialData?.payment?.saleId || "",
      incomeCategoryId: initialData?.payment?.incomeCategoryId || "",
      receivingAccountId: initialData?.payment?.receivingAccountId || "",
      amountReceived:
        parseFloat(initialData?.payment?.amountReceived as any) || 0,
      balanceDueAfterPayment: initialData?.payment?.balanceDueAfterPayment || 0,
      paymentMethod: initialData?.payment?.paymentMethod || PaymentMethod.Cash,
      checkNumber: initialData?.payment?.checkNumber || "",
      checkDate: initialData?.payment?.checkDate
        ? new Date(initialData.payment.checkDate)
        : undefined,
      checkBankName: initialData?.payment?.checkBankName || "",
      notes: initialData?.payment?.notes || "",
      attachments: initialData?.payment?.attachments || [],
      currentReceivingAccountBalance: initialData?.receivingAccount
        ?.currentBalance
        ? parseFloat(initialData.receivingAccount.currentBalance as any)
        : undefined,
    }),
    [initialData, initialGeneratedReferenceNumber]
  );

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(IncomeFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const isAnyMutationLoading = isRecordingIncome || isUpdatingIncome;

  const selectedReceivingAccountId = form.watch("receivingAccountId");
  const selectedCustomerId = form.watch("customerId");
  const selectedSaleId = form.watch("saleId");
  const selectedPaymentMethod = form.watch("paymentMethod");
  const amountReceived = form.watch("amountReceived");

  // Auto-set balance due after payment
  useEffect(() => {
    if (incomeTypeTab === "sales_payment" && selectedSaleId) {
      const selectedSale = sales.find(
        (sale) => sale.sale.id === selectedSaleId
      );
      if (selectedSale) {
        // Calculate current amount due (totalAmount - amountPaid)
        const currentAmountDue =
          parseFloat(selectedSale.sale.totalAmount as any) -
          parseFloat(selectedSale.sale.amountPaid as any);

        // Calculate balance due after this payment
        const newBalanceDue = Math.max(
          0,
          currentAmountDue - (amountReceived || 0)
        );

        form.setValue("balanceDueAfterPayment", newBalanceDue, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    } else if (incomeTypeTab === "other_income") {
      // For other income, there's no balance due
      form.setValue("balanceDueAfterPayment", 0, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }, [incomeTypeTab, sales, selectedSaleId, amountReceived, form]);

  // Auto-set payment method based on receiving account type
  useEffect(() => {
    const account = receivingAccounts.find(
      (acc) => acc.account.id === selectedReceivingAccountId
    );

    if (account) {
      const newBalance = parseFloat(account.account.currentBalance as any) || 0;
      form.setValue("currentReceivingAccountBalance", newBalance, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setDisplayedCurrentReceivingAccountBalance(newBalance);

      // Auto-set payment method based on account type
      const suggestedPaymentMethod = getPaymentMethodFromAccountType(
        account.account.accountType as AccountType
      );
      form.setValue("paymentMethod", suggestedPaymentMethod, {
        shouldValidate: true,
      });
    } else {
      form.setValue("currentReceivingAccountBalance", undefined, {
        shouldValidate: true,
      });
      setDisplayedCurrentReceivingAccountBalance(null);
    }
  }, [selectedReceivingAccountId, receivingAccounts, form]);

  useEffect(() => {
    if (!selectedCustomerId) {
      form.setValue("saleId", "", { shouldValidate: true });
    }
  }, [selectedCustomerId, form]);

  useEffect(() => {
    if (
      mode === "create" &&
      incomeTypeTab === "sales_payment" &&
      selectedSaleId
    ) {
      const selectedSale = sales.find(
        (sale) => sale.sale.id === selectedSaleId
      );
      if (selectedSale) {
        const amountDue =
          parseFloat(selectedSale.sale.totalAmount as any) -
          parseFloat(selectedSale.sale.amountPaid as any);
        if (amountDue > 0 && form.getValues("amountReceived") !== amountDue) {
          form.setValue("amountReceived", amountDue, { shouldValidate: true });
        }
      }
    }
  }, [selectedSaleId, sales, mode, incomeTypeTab, form]);

  // Clear check fields when payment method is not check
  useEffect(() => {
    if (selectedPaymentMethod !== PaymentMethod.Check) {
      form.setValue("checkNumber", "");
      form.setValue("checkDate", undefined);
      form.setValue("checkBankName", "");
    }
  }, [selectedPaymentMethod, form]);

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  useEffect(() => {
    if (
      mode === "create" &&
      initialGeneratedReferenceNumber &&
      form.getValues("paymentRefNumber") === ""
    ) {
      form.setValue("paymentRefNumber", initialGeneratedReferenceNumber);
    }
  }, [initialGeneratedReferenceNumber, form, mode]);

  const handleRefreshRefNumber = async () => {
    if (mode === "create") {
      try {
        setIsRefetchingReferenceNumber(true);
        const newRefNumber = await generatePaymentReferenceNumber();
        form.setValue("paymentRefNumber", newRefNumber);
      } catch (error) {
        console.error("Error refreshing payment reference number:", error);
      } finally {
        setIsRefetchingReferenceNumber(false);
      }
    }
  };

  const onSubmit = async (values: IncomeFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create" ? "Recording Income..." : "Updating Income Record..."
    );

    try {
      const isValid = await form.trigger();
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
        currentReceivingAccountBalance: undefined,
        customerId:
          incomeTypeTab === "sales_payment" ? values.customerId : undefined,
        saleId: incomeTypeTab === "sales_payment" ? values.saleId : undefined,
        incomeCategoryId:
          incomeTypeTab === "other_income"
            ? values.incomeCategoryId
            : undefined,
        // Clear check fields if payment method is not check
        checkNumber:
          values.paymentMethod === PaymentMethod.Check
            ? values.checkNumber
            : undefined,
        checkDate:
          values.paymentMethod === PaymentMethod.Check
            ? values.checkDate
            : undefined,
        checkBankName:
          values.paymentMethod === PaymentMethod.Check
            ? values.checkBankName
            : undefined,
      };

      if (!user?.id) {
        toast.error("User not authenticated", { id: loadingToastId });
        return;
      }
      if (mode === "create") {
        await recordIncome(
          { data: dataWithAttachments, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Income recorded successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/income/register");
              router.refresh();
              form.reset(defaultValues);
            },
            onError: (error) => {
              toast.error(error.message || "Failed to record Income.", {
                id: loadingToastId,
              });
            },
          }
        );
      } else if (mode === "edit" && initialData?.payment?.id) {
        const previousAttachmentIds =
          initialData.payment.attachments?.map((a: Attachment) => a.id) || [];
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

        await updateIncome(
          {
            id: initialData.payment.id,
            data: dataWithAttachments,
            userId: user.id,
          },
          {
            onSuccess: () => {
              toast.success("Income record updated successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/income");
              router.refresh();
            },
            onError: (error: any) => {
              toast.error(error.message || "Failed to update Income record.", {
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
              name="paymentRefNumber"
              label="Payment Reference Number"
              placeholder="e.g., REC-001, PMT-5678"
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

        <Tabs
          value={incomeTypeTab}
          onValueChange={(value) =>
            setIncomeTypeTab(value as "sales_payment" | "other_income")
          }
          className="w-full pt-4"
        >
          <TabsList className="grid w-full grid-cols-2 gap-5">
            <TabsTrigger
              value="sales_payment"
              className="w-full bg-white text-blue-800 font-semibold py-3 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
            >
              Sales Payment
            </TabsTrigger>
            <TabsTrigger
              value="other_income"
              className="w-full bg-white text-blue-800 font-semibold py-3 data-[state=active]:bg-blue-800 data-[state=active]:text-white"
            >
              Other Income
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="sales_payment"
            className="space-y-5 p-4 border rounded-md mt-4"
          >
            <div className="w-full flex flex-col md:flex-row gap-5">
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="customerId"
                label="Customer"
                placeholder="Select customer"
                disabled={
                  isAnyMutationLoading || incomeTypeTab === "other_income"
                }
                key={`customer-select-${form.watch("customerId") || ""}`}
              >
                {customers.map((customer) => (
                  <SelectItem
                    key={customer.id}
                    value={customer.id || ""}
                    className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                  >
                    {customer.name}
                  </SelectItem>
                ))}
              </CustomFormField>

              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="saleId"
                label="Linked Sale (Outstanding Invoice)"
                placeholder={
                  selectedCustomerId ? "Select sale" : "Select customer first"
                }
                disabled={
                  isAnyMutationLoading ||
                  !selectedCustomerId ||
                  incomeTypeTab === "other_income"
                }
                key={`sale-select-${form.watch("saleId") || ""}`}
              >
                {sales
                  .filter((sale) => sale.sale.customerId === selectedCustomerId)
                  .map((sale) => (
                    <SelectItem
                      key={sale.sale.id}
                      value={sale.sale.id || ""}
                      className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                    >
                      {sale.sale.invoiceNumber} (Due:{" "}
                      <FormatNumber
                        value={
                          parseFloat(sale.sale.totalAmount as any) -
                          parseFloat(sale.sale.amountPaid as any)
                        }
                      />
                      )
                    </SelectItem>
                  ))}
              </CustomFormField>
            </div>
          </TabsContent>
          <TabsContent
            value="other_income"
            className="space-y-5 p-4 border rounded-md mt-4"
          >
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="incomeCategoryId"
              label="Income Category"
              placeholder="Select income category"
              disabled={
                isAnyMutationLoading || incomeTypeTab === "sales_payment"
              }
              key={`income-category-select-${
                form.watch("incomeCategoryId") || ""
              }`}
            >
              {incomeCategories.map((cat) => (
                <SelectItem
                  key={cat.incomeCategory.id}
                  value={cat.incomeCategory.id || ""}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                >
                  {cat.incomeCategory.name}
                </SelectItem>
              ))}
            </CustomFormField>
          </TabsContent>
        </Tabs>

        <div className="w-full flex flex-col md:flex-row gap-5">
          <div className="flex flex-1 flex-col gap-2">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="receivingAccountId"
              label="Receiving Account (Destination of Funds)"
              placeholder="Select receiving account"
              disabled={isAnyMutationLoading}
              key={form.watch("receivingAccountId") || ""}
            >
              {receivingAccounts.map((account) => (
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
            {selectedReceivingAccountId && (
              <p
                className={cn(
                  "text-sm pl-2",
                  displayedCurrentReceivingAccountBalance &&
                    displayedCurrentReceivingAccountBalance > 0
                    ? "text-green-500"
                    : "text-red-600",
                  form.formState.errors.amountReceived?.message ||
                    form.formState.errors.receivingAccountId?.message
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
                {form.formState.errors.amountReceived?.message && (
                  <span className="ml-2 text-red-600">
                    ({form.formState.errors.amountReceived.message})
                  </span>
                )}
                {form.formState.errors.receivingAccountId?.message && (
                  <span className="ml-2 text-red-600">
                    ({form.formState.errors.receivingAccountId.message})
                  </span>
                )}
              </p>
            )}
            <input
              type="hidden"
              {...form.register("currentReceivingAccountBalance", {
                valueAsNumber: true,
              })}
            />
          </div>
          <CustomFormField
            fieldType={FormFieldType.AMOUNT}
            control={form.control}
            name="amountReceived"
            label="Amount Received"
            placeholder="0.00"
            disabled={isAnyMutationLoading}
          />
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="paymentMethod"
            label="Payment Method"
            placeholder="Select payment method"
            disabled={isAnyMutationLoading}
            key={form.watch("paymentMethod") || ""}
          >
            {Object.values(PaymentMethod).map((method) => (
              <SelectItem
                key={method}
                value={method}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
              >
                {method.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </CustomFormField>

          <CustomFormField
            fieldType={FormFieldType.AMOUNT}
            control={form.control}
            name="balanceDueAfterPayment"
            label="Balance Due After Payment"
            placeholder="0.00"
            disabled={true}
            key={form.watch("balanceDueAfterPayment") || 0}
          />
        </div>

        {/* Check Details Section - Only visible when payment method is Check */}
        {selectedPaymentMethod === PaymentMethod.Check && (
          <div className="w-full space-y-4 p-4 border rounded-md bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-800">
              Check Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="checkNumber"
                label="Check Number"
                placeholder="Enter check number"
                disabled={isAnyMutationLoading}
              />
              <CustomFormField
                fieldType={FormFieldType.DATE_PICKER}
                control={form.control}
                name="checkDate"
                label="Check Date"
                dateFormat="MM/dd/yyyy"
                disabled={isAnyMutationLoading}
              />
            </div>
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="checkBankName"
              label="Bank Name"
              placeholder="Enter bank name on check"
              disabled={isAnyMutationLoading}
            />
          </div>
        )}

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
            {mode === "create" ? "Record Income" : "Update Income Record"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};
