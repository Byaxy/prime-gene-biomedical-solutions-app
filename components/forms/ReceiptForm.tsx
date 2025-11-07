/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import DeleteIcon from "@mui/icons-material/Delete";

import { ReceiptFormValidation, ReceiptFormValues } from "@/lib/validation";
import {
  Customer,
  ReceiptWithRelations,
  IncomeWithRelations,
  SaleWithRelations,
  Attachment,
  PaymentMethod,
} from "@/types";

import { Form, FormControl } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { FileUploader } from "../FileUploader";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateReceiptNumber } from "@/lib/actions/receipts.actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

import { useReceipts } from "@/hooks/useReceipts";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { X } from "lucide-react";
import { Check } from "lucide-react";

interface ReceiptFormProps {
  mode: "create" | "edit";
  initialData?: ReceiptWithRelations;
  customers: Customer[];
  availablePayments: IncomeWithRelations[];
  sales: SaleWithRelations[];
  generatedReceiptNumber?: string;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  mode,
  initialData,
  customers,
  availablePayments,
  generatedReceiptNumber: initialGeneratedReceiptNumber,
  sales,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { createReceipt, isCreatingReceipt, updateReceipt, isUpdatingReceipt } =
    useReceipts();

  const [isRefetchingReceiptNumber, setIsRefetchingReceiptNumber] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedPaymentId, setPrevSelectedPaymentId] = useState<
    string | null
  >(null);

  // Helper to find a full IncomeWithRelations object from its base payment ID
  const findIncomeWithRelations = useCallback(
    (paymentId: string) => {
      return availablePayments.find((ip) => ip.payment.id === paymentId);
    },
    [availablePayments]
  );

  const defaultValues = useMemo(
    () => ({
      receiptNumber:
        initialData?.receipt?.receiptNumber ||
        initialGeneratedReceiptNumber ||
        "",
      receiptDate: initialData?.receipt?.receiptDate
        ? new Date(initialData.receipt.receiptDate)
        : new Date(),
      customerId: initialData?.receipt?.customerId || "",
      totalAmountReceived:
        parseFloat(initialData?.receipt?.totalAmountReceived as any) || 0,
      totalAmountDue:
        parseFloat(initialData?.receipt?.totalAmountDue as any) || 0,
      totalBalanceDue:
        parseFloat(initialData?.receipt?.totalBalanceDue as any) || 0,
      attachments: initialData?.receipt?.attachments || [],
      receiptItems:
        initialData?.items?.map((item) => ({
          id: item.receiptItem.id,
          paymentReceivedId: item.receiptItem.paymentReceivedId,
          invoiceNumber: item.receiptItem.invoiceNumber || "",
          invoiceDate: item.receiptItem.invoiceDate
            ? new Date(item.receiptItem.invoiceDate)
            : undefined,
          amountDue: parseFloat(item.receiptItem.amountDue as any) || 0,
          amountReceived:
            parseFloat(item.receiptItem.amountReceived as any) || 0,
          balanceDue: parseFloat(item.receiptItem.balanceDue as any) || null,
          paymentMethod: item.receiptItem.paymentMethod as PaymentMethod,
          saleId: item.receiptItem.saleId || null,
          incomeCategoryId: item.receiptItem.incomeCategoryId || null,
        })) || [],

      selectedPayment: "",
    }),
    [initialData, initialGeneratedReceiptNumber]
  );

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(ReceiptFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: "receiptItems",
  });

  const isAnyMutationLoading = isCreatingReceipt || isUpdatingReceipt;

  const selectedCustomerId = form.watch("customerId");
  const receiptItems = form.watch("receiptItems");
  const selectedPayment = form.watch("selectedPayment");

  // Filter available payments based on selected customer and already added payments
  const filteredAvailablePayments = useMemo(() => {
    const addedPaymentIds = new Set(
      receiptItems.map((item) => item.paymentReceivedId)
    );
    return availablePayments.filter(
      (incomeWithRel) =>
        incomeWithRel.payment.customerId === selectedCustomerId &&
        !addedPaymentIds.has(incomeWithRel.payment.id)
    );
  }, [availablePayments, selectedCustomerId, receiptItems]);

  // calculate the customer's total amount due from all their sales
  const customerTotalAmountDue = useMemo(() => {
    if (!selectedCustomerId) return 0;

    // Calculate total from sales
    const customerSales = sales.filter(
      (sale) => sale.sale.customerId === selectedCustomerId
    );

    const totalSalesAmount = customerSales.reduce(
      (sum, sale) => sum + parseFloat((sale.sale.totalAmount as any) || "0"),
      0
    );

    const totalAmountPaid = customerSales.reduce(
      (sum, sale) => sum + parseFloat((sale.sale.amountPaid as any) || "0"),
      0
    );

    // Current outstanding balance for sales
    const currentSalesBalance = totalSalesAmount - totalAmountPaid;

    // For non-sales income (income categories), we only consider the current receipt items
    // since they don't have ongoing balances - they're one-time payments
    const currentReceiptSalesPayments = receiptItems
      .filter((item) => item.saleId !== null) // Only sales-related payments
      .reduce((sum, item) => sum + (item.amountReceived || 0), 0);

    const currentReceiptNonSalesPayments = receiptItems
      .filter((item) => item.saleId === null && item.incomeCategoryId !== null) // Only income category payments
      .reduce((sum, item) => sum + (item.amountReceived || 0), 0);

    // Total Amount Due =
    // (Sales balance before receipt payments) + (Non-sales payments in this receipt)
    return (
      currentSalesBalance +
      currentReceiptSalesPayments +
      currentReceiptNonSalesPayments
    );
  }, [selectedCustomerId, sales, receiptItems]);

  // Update totals whenever receipt items change
  const updateTotals = useCallback(() => {
    let totalReceived = 0;

    receiptItems.forEach((item) => {
      totalReceived += item.amountReceived;
    });

    form.setValue("totalAmountReceived", totalReceived, {
      shouldValidate: true,
    });

    // Set the customer's overall amount due from all sales
    form.setValue("totalAmountDue", customerTotalAmountDue, {
      shouldValidate: true,
    });

    // Balance due is the difference between customer's total amount due and total received
    const totalBalanceDue = customerTotalAmountDue - totalReceived;
    form.setValue("totalBalanceDue", totalBalanceDue, {
      shouldValidate: true,
    });
  }, [receiptItems, customerTotalAmountDue, form]);

  useEffect(() => {
    updateTotals();
  }, [receiptItems, updateTotals, customerTotalAmountDue]);

  useEffect(() => {
    if (
      mode === "create" &&
      initialGeneratedReceiptNumber &&
      form.getValues("receiptNumber") === ""
    ) {
      form.setValue("receiptNumber", initialGeneratedReceiptNumber);
    }
  }, [initialGeneratedReceiptNumber, form, mode]);

  const handleRefreshRefNumber = async () => {
    if (mode === "create") {
      try {
        setIsRefetchingReceiptNumber(true);
        const newRefNumber = await generateReceiptNumber();
        form.setValue("receiptNumber", newRefNumber);
      } catch (error) {
        console.error("Error refreshing receipt number:", error);
      } finally {
        setIsRefetchingReceiptNumber(false);
      }
    }
  };

  //handleAddPayment function
  const handleAddPayment = () => {
    if (!selectedPayment) return;

    const incomeWithRel = findIncomeWithRelations(selectedPayment);
    if (!incomeWithRel) return;

    const payment = incomeWithRel.payment;
    const linkedSale = incomeWithRel.sale;
    const linkedIncomeCategory = incomeWithRel.incomeCategory;

    let invoiceNumber: string | null = null;
    let invoiceDate: Date | null = null;
    let itemAmountDue: number = 0;
    let itemBalanceDue: number = 0;

    const paymentAmount = parseFloat(payment.amountReceived as any);

    if (linkedSale) {
      // Handle sales-linked payments (existing logic)
      invoiceNumber = linkedSale.invoiceNumber;
      invoiceDate = new Date(linkedSale.saleDate);

      itemAmountDue =
        (payment.balanceDueAfterPayment || 0) + payment.amountReceived;
      itemBalanceDue = payment.balanceDueAfterPayment || 0;
    } else if (linkedIncomeCategory) {
      invoiceNumber = linkedIncomeCategory.name;
      invoiceDate = new Date(payment.paymentDate);
      itemAmountDue = paymentAmount;
      itemBalanceDue = 0; // No balance for one-time income category payments
    } else {
      // Handle unlinked payments (fallback)
      itemAmountDue = paymentAmount;
      itemBalanceDue = 0;
    }

    prepend({
      paymentReceivedId: payment.id,
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      amountDue: itemAmountDue,
      amountReceived: paymentAmount,
      balanceDue: itemBalanceDue,
      paymentMethod: payment.paymentMethod,
      saleId: payment.saleId || null,
      incomeCategoryId: payment.incomeCategoryId || null,
    });

    form.setValue("selectedPayment", "");
  };

  const handleRemovePayment = (index: number) => {
    remove(index);
  };

  const handleCancel = () => {
    form.reset(defaultValues);
  };

  const onSubmit = async (values: ReceiptFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create" ? "Creating Receipt..." : "Updating Receipt..."
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
      };

      if (!user?.id) {
        toast.error("User not authenticated", { id: loadingToastId });
        return;
      }

      if (mode === "create") {
        await createReceipt(
          { data: dataWithAttachments },
          {
            onSuccess: () => {
              toast.success("Receipt created successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/income/receipts");
              router.refresh();
              form.reset(defaultValues);
            },
          }
        );
      } else if (mode === "edit" && initialData?.receipt?.id) {
        const previousAttachmentIds =
          initialData.receipt.attachments?.map((a: Attachment) => a.id) || [];
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

        await updateReceipt(
          { id: initialData.receipt.id, data: dataWithAttachments },
          {
            onSuccess: () => {
              toast.success("Receipt updated successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/income/receipts");
              router.refresh();
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
              name="receiptNumber"
              label="Receipt Number"
              placeholder="e.g., RPT-001"
              disabled={isAnyMutationLoading}
            />
            {mode === "create" && (
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshRefNumber}
                className="self-end shad-primary-btn px-5"
                disabled={isRefetchingReceiptNumber || isAnyMutationLoading}
              >
                <RefreshCw
                  className={cn(
                    "h-5 w-5",
                    isRefetchingReceiptNumber && "animate-spin"
                  )}
                />
              </Button>
            )}
          </div>
          <CustomFormField
            fieldType={FormFieldType.DATE_PICKER}
            control={form.control}
            name="receiptDate"
            label="Receipt Date"
            dateFormat="MM/dd/yyyy"
            disabled={isAnyMutationLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="customerId"
            label="Customer"
            placeholder="Select customer"
            disabled={isAnyMutationLoading}
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
        </div>

        {/* Receipt Items Section */}
        <div
          className={`space-y-5 ${
            form.formState.errors.receiptItems
              ? "border-2 border-red-500 p-4 rounded-md"
              : ""
          }`}
        >
          {/* Add Payment Received Selector */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2">
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="selectedPayment"
                label="Add Payment Received"
                placeholder={"Select payment to add"}
                disabled={
                  !selectedCustomerId ||
                  filteredAvailablePayments.length === 0 ||
                  isAnyMutationLoading
                }
                key={`payment-select-${form.watch("selectedPayment") || ""}`}
              >
                <div className="py-3">
                  <div className="relative flex items-center rounded-md border border-dark-700 bg-white">
                    <Search className="ml-2 h-4 w-4 opacity-50" />
                    <Input
                      type="text"
                      placeholder="Search by Product ID, Product Name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                      disabled={
                        !selectedCustomerId ||
                        filteredAvailablePayments.length === 0 ||
                        isAnyMutationLoading
                      }
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-3 text-dark-700 hover:text-dark-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {filteredAvailablePayments &&
                filteredAvailablePayments.length > 0 ? (
                  <>
                    <Table className="shad-table border border-light-200 rounded-lg">
                      <TableHeader>
                        <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                          <TableHead>PRN</TableHead>
                          <TableHead>Invoice No.</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="w-full bg-white">
                        {filteredAvailablePayments.map(
                          (p: IncomeWithRelations) => (
                            <TableRow
                              key={p.payment.id}
                              className="cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                if (isAnyMutationLoading) return;
                                form.setValue("selectedPayment", p.payment.id);
                                setPrevSelectedPaymentId(p.payment.id);
                                setSearchQuery("");
                                // Find and click the hidden SelectItem with this value
                                const selectItem = document.querySelector(
                                  `[data-value="${p.payment.id}"]`
                                ) as HTMLElement;
                                if (selectItem) {
                                  selectItem.click();
                                }
                              }}
                            >
                              <TableCell>
                                {p.payment.paymentRefNumber}
                              </TableCell>
                              <TableCell>
                                {p.sale
                                  ? `${p.sale.invoiceNumber}`
                                  : p.incomeCategory
                                  ? `${p.incomeCategory.name}`
                                  : "-"}
                              </TableCell>
                              <TableCell>{p.payment.amountReceived}</TableCell>
                              <TableCell className="w-10">
                                {prevSelectedPaymentId === p.payment.id && (
                                  <span className="text-blue-800">
                                    <Check className="h-5 w-5" />
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                    {/* Hidden select options for form control */}
                    <div className="hidden">
                      {filteredAvailablePayments.map((p) => (
                        <SelectItem
                          key={p.payment.id}
                          value={p.payment.id}
                          data-value={p.payment.id}
                        >
                          {p.payment.paymentRefNumber} -{" "}
                          {p.sale
                            ? `Invoice: ${p.sale.invoiceNumber}`
                            : p.incomeCategory
                            ? `Category: ${p.incomeCategory.name}`
                            : "Other Income"}
                          {}
                        </SelectItem>
                      ))}
                    </div>
                  </>
                ) : (
                  <SelectItem value="null" disabled>
                    {selectedPayment ? (
                      <div>No Paymnets found for this customer</div>
                    ) : (
                      <div>Please select a Customer first</div>
                    )}
                  </SelectItem>
                )}
              </CustomFormField>
            </div>
            <Button
              type="button"
              onClick={handleAddPayment}
              disabled={!selectedPayment || isAnyMutationLoading}
              className="self-end shad-primary-btn h-11"
            >
              Add Item
            </Button>
          </div>

          <Table className="shad-table">
            <TableHeader>
              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                <TableHead>#</TableHead>
                <TableHead>Payment Ref</TableHead>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Balance Due</TableHead>
                <TableHead>Pmt. Method</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {fields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-4">
                    No Payments added yet.
                  </TableCell>
                </TableRow>
              )}
              {fields.map((field, index) => {
                const incomeWithRel =
                  findIncomeWithRelations(field.paymentReceivedId) ||
                  availablePayments.find(
                    (ip) => ip.payment.id === field.paymentReceivedId
                  );
                const payment = incomeWithRel?.payment;
                const linkedSale = incomeWithRel?.sale;
                const linkedIncomeCategory = incomeWithRel?.incomeCategory;

                return (
                  <TableRow
                    key={field.id}
                    className={cn("w-full", {
                      "bg-blue-50": index % 2 === 1,
                    })}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {payment?.paymentRefNumber}
                      {/* Hidden fields to store data for submission */}

                      {/* Include ID for updates */}
                      <input
                        type="hidden"
                        {...form.register(
                          `receiptItems.${index}.paymentReceivedId`
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      {linkedSale?.invoiceNumber ||
                        linkedIncomeCategory?.name ||
                        "N/A"}
                      <input
                        type="hidden"
                        {...form.register(`receiptItems.${index}.saleId`)}
                      />
                      <input
                        type="hidden"
                        {...form.register(
                          `receiptItems.${index}.incomeCategoryId`
                        )}
                      />
                      <input
                        type="hidden"
                        {...form.register(
                          `receiptItems.${index}.invoiceNumber`
                        )}
                      />{" "}
                      {/* This should come from the linked Sale if available */}
                    </TableCell>
                    <TableCell>
                      {field.invoiceDate
                        ? formatDateTime(field.invoiceDate).dateTime
                        : "N/A"}
                      <input
                        type="hidden"
                        {...form.register(`receiptItems.${index}.invoiceDate`)}
                      />
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={field.amountDue || 0} />
                      <input
                        type="hidden"
                        {...form.register(`receiptItems.${index}.amountDue`)}
                      />
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={field.amountReceived || 0} />
                      <input
                        type="hidden"
                        {...form.register(
                          `receiptItems.${index}.amountReceived`
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={field.balanceDue || 0} />
                      <input
                        type="hidden"
                        {...form.register(`receiptItems.${index}.balanceDue`)}
                      />
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment?.paymentMethod.replace(/_/g, " ")}
                      <input
                        type="hidden"
                        {...form.register(
                          `receiptItems.${index}.paymentMethod`
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-row items-center">
                        <span
                          onClick={() => {
                            if (!isAnyMutationLoading)
                              handleRemovePayment(index);
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
                );
              })}
            </TableBody>
          </Table>

          {/* Form Fields for Totals (Read-only, calculated) */}
          <div className="pt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            <CustomFormField
              fieldType={FormFieldType.AMOUNT}
              control={form.control}
              name="totalAmountReceived"
              label="Total Amount Received"
              placeholder="0.00"
              disabled={true}
            />
            <CustomFormField
              fieldType={FormFieldType.AMOUNT}
              control={form.control}
              name="totalAmountDue"
              label="Total Amount Due"
              placeholder="0.00"
              disabled={true}
            />
            <CustomFormField
              fieldType={FormFieldType.AMOUNT}
              control={form.control}
              name="totalBalanceDue"
              label="Total Balance Due"
              placeholder="0.00"
              disabled={true}
            />
          </div>
        </div>

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
            {mode === "create" ? "Create Receipt" : "Update Receipt"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};
