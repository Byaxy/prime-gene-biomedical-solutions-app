/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCommissions } from "@/hooks/useCommissions";
import {
  SaleCommissionEntryFormValues,
  SalesCommissionFormValidation,
  SalesCommissionFormValues,
  CommissionRecipientItemFormValues,
} from "@/lib/validation";
import {
  CommissionRecipientWithRelations,
  CommissionWithRelations,
  Customer,
  SalesAgentWithRelations,
  SaleWithRelations,
  Tax,
} from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { cn, calculateCommissionAmounts } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { Plus } from "lucide-react";
import { SaleEntryDialog } from "../commissions/SaleEntryDialog";
import { SelectItem } from "../ui/select";
import { RefreshCw } from "lucide-react";
import { generateCommissionRefNumber } from "@/lib/actions/commission.actions";

interface SalesCommissionFormProps {
  mode: "create" | "edit";
  initialData?: CommissionWithRelations;
  sales: SaleWithRelations[];
  salesAgents: SalesAgentWithRelations[];
  taxes: Tax[];
  customers: Customer[];
  generatedCommissionRefNumber?: string;
}

const SalesCommissionForm = ({
  mode,
  initialData,
  sales,
  salesAgents,
  taxes: allTaxes,
  customers,
  generatedCommissionRefNumber,
}: SalesCommissionFormProps) => {
  const router = useRouter();
  const {
    createCommission,
    isCreatingCommission,
    updateCommission,
    isUpdatingCommission,
  } = useCommissions();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(
    null
  );
  const [isRefetchingReffNumber, setIsRefetchingReffNumber] = useState(false);

  const mapInitialDataToFormValues = useCallback(
    (data: CommissionWithRelations): SalesCommissionFormValues => {
      if (!data?.commission) {
        return {
          commissionRefNumber: "",
          commissionDate: new Date(),
          customerId: "",
          saleEntries: [],
          notes: "",
        };
      }

      const commission = data.commission;

      // Map commissionSales to saleEntries
      const saleEntries: SaleCommissionEntryFormValues[] =
        data.commissionSales.map((cs) => {
          // Re-calculate the fields for this specific sale entry
          const {
            baseForCommission,
            grossCommission,
            withholdingTaxAmount,
            totalCommissionPayable,
          } = calculateCommissionAmounts(
            parseFloat(cs.commissionSale.amountReceived as any) || 0,
            parseFloat(cs.commissionSale.additions as any) || 0,
            parseFloat(cs.commissionSale.deductions as any) || 0,
            parseFloat(cs.commissionSale.commissionRate as any) / 100 || 0,
            parseFloat(cs.commissionSale.withholdingTaxRate as any) / 100 || 0
          );

          // Map recipients related to this specific commissionSale
          const recipients: CommissionRecipientItemFormValues[] =
            cs.recipients.map((crs) => ({
              id: crs.recipientSale.id, // ID from commission_recipient_sales
              salesAgentId: crs.commissionRecipient.salesAgentId,
              amount: parseFloat(crs.recipientSale.amount as any) || 0,
            }));

          return {
            id: cs.commissionSale.id, // ID from commission_sales
            saleId: cs.commissionSale.saleId,
            amountReceived:
              parseFloat(cs.commissionSale.amountReceived as any) || 0,
            additions: parseFloat(cs.commissionSale.additions as any) || 0,
            deductions: parseFloat(cs.commissionSale.deductions as any) || 0,
            commissionRate:
              parseFloat(cs.commissionSale.commissionRate as any) || 0,
            withholdingTaxRate:
              parseFloat(cs.commissionSale.withholdingTaxRate as any) || 0,
            withholdingTaxId: cs.commissionSale.withholdingTaxId || null,

            baseForCommission,
            grossCommission,
            withholdingTaxAmount,
            totalCommissionPayable,
            recipients,
          };
        });

      // Aggregate overall recipients for the `overallRecipients` field (display only)
      const overallRecipientsMap = new Map<
        string,
        { id?: string; salesAgentId: string; totalAmount: number }
      >();
      data.recipients.forEach((rec: CommissionRecipientWithRelations) => {
        overallRecipientsMap.set(rec.salesAgent.id, {
          id: rec.recipient.id, // ID from commission_recipients
          salesAgentId: rec.salesAgent.id,
          totalAmount: parseFloat(rec.recipient.amount as any) || 0,
        });
      });
      const overallRecipients = Array.from(overallRecipientsMap.values());

      return {
        commissionRefNumber: commission.commissionRefNumber,
        commissionDate: new Date(commission.commissionDate),
        customerId: commission.customerId, // NEW: Customer ID
        saleEntries: saleEntries,
        notes: commission.notes || "",
        totalAmountReceived:
          parseFloat(commission.totalAmountReceived as any) || 0,
        totalAdditions: parseFloat(commission.totalAdditions as any) || 0,
        totalDeductions: parseFloat(commission.totalDeductions as any) || 0,
        totalBaseForCommission:
          parseFloat(commission.totalBaseForCommission as any) || 0,
        totalGrossCommission:
          parseFloat(commission.totalGrossCommission as any) || 0,
        totalWithholdingTaxAmount:
          parseFloat(commission.totalWithholdingTaxAmount as any) || 0,
        totalCommissionPayable:
          parseFloat(commission.totalCommissionPayable as any) || 0,
        overallRecipients: overallRecipients,
      };
    },
    []
  );

  const defaultFormValues = useMemo<SalesCommissionFormValues>(() => {
    return {
      commissionRefNumber: generatedCommissionRefNumber || "",
      commissionDate: new Date(),
      customerId: "",
      saleEntries: [],
      notes: "",
      totalAmountReceived: 0,
      totalAdditions: 0,
      totalDeductions: 0,
      totalBaseForCommission: 0,
      totalGrossCommission: 0,
      totalWithholdingTaxAmount: 0,
      totalCommissionPayable: 0,
      overallRecipients: [],
    };
  }, [generatedCommissionRefNumber]);

  const form = useForm<SalesCommissionFormValues>({
    resolver: zodResolver(SalesCommissionFormValidation),
    mode: "all",
    defaultValues: defaultFormValues,
  });

  const {
    fields: saleEntryFields,
    append: appendSaleEntry,
    remove: removeSaleEntry,
    update: updateSaleEntry,
  } = useFieldArray({
    control: form.control,
    name: "saleEntries",
  });

  const isAnyMutationLoading = isCreatingCommission || isUpdatingCommission;

  // Watch sale entries to calculate aggregate totals and overall recipients
  const watchSaleEntries = form.watch("saleEntries");

  useEffect(() => {
    let grandTotalAmountReceived = 0;
    let grandTotalAdditions = 0;
    let grandTotalDeductions = 0;
    let grandTotalBaseForCommission = 0;
    let grandTotalGrossCommission = 0;
    let grandTotalWithholdingTaxAmount = 0;
    let grandTotalCommissionPayable = 0;
    const overallRecipientsMap = new Map<
      string,
      { salesAgentId: string; totalAmount: number }
    >();

    watchSaleEntries.forEach((entry) => {
      grandTotalAmountReceived += entry.amountReceived || 0;
      grandTotalAdditions += entry.additions || 0;
      grandTotalDeductions += entry.deductions || 0;
      grandTotalBaseForCommission += entry.baseForCommission || 0;
      grandTotalGrossCommission += entry.grossCommission || 0;
      grandTotalWithholdingTaxAmount += entry.withholdingTaxAmount || 0;
      grandTotalCommissionPayable += entry.totalCommissionPayable || 0;

      entry.recipients.forEach((r) => {
        overallRecipientsMap.set(r.salesAgentId, {
          salesAgentId: r.salesAgentId,
          totalAmount:
            (overallRecipientsMap.get(r.salesAgentId)?.totalAmount || 0) +
            r.amount,
        });
      });
    });

    form.setValue("totalAmountReceived", grandTotalAmountReceived, {
      shouldValidate: true,
    });
    form.setValue("totalAdditions", grandTotalAdditions, {
      shouldValidate: true,
    });
    form.setValue("totalDeductions", grandTotalDeductions, {
      shouldValidate: true,
    });
    form.setValue("totalBaseForCommission", grandTotalBaseForCommission, {
      shouldValidate: true,
    });
    form.setValue("totalGrossCommission", grandTotalGrossCommission, {
      shouldValidate: true,
    });
    form.setValue("totalWithholdingTaxAmount", grandTotalWithholdingTaxAmount, {
      shouldValidate: true,
    });
    form.setValue("totalCommissionPayable", grandTotalCommissionPayable, {
      shouldValidate: true,
    });
    form.setValue(
      "overallRecipients",
      Array.from(overallRecipientsMap.values()),
      { shouldValidate: true }
    );
  }, [watchSaleEntries, form]);

  // Initialize form with initialData in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const mappedData = mapInitialDataToFormValues(initialData);
      form.reset(mappedData);
    }
  }, [initialData, mode, form, defaultFormValues, mapInitialDataToFormValues]);

  useEffect(() => {
    if (
      mode === "create" &&
      generatedCommissionRefNumber &&
      form.getValues("commissionRefNumber") === ""
    ) {
      form.setValue("commissionRefNumber", generatedCommissionRefNumber);
    }
  }, [generatedCommissionRefNumber, form, mode]);

  // Refresh button handler
  const handleRefreshReffNumber = async () => {
    if (mode === "create") {
      try {
        setIsRefetchingReffNumber(true);
        const newReffNumber = await generateCommissionRefNumber();
        form.setValue("commissionRefNumber", newReffNumber);
      } catch (error) {
        console.error("Error refreshing commission reference number:", error);
        toast.error("Failed to refresh commission reference number");
      } finally {
        setIsRefetchingReffNumber(false);
      }
    }
  };

  const handleAddSaleEntry = () => {
    setEditingEntryIndex(null);
    setIsDialogOpen(true);
  };

  const handleEditSaleEntry = (index: number) => {
    setEditingEntryIndex(index);
    setIsDialogOpen(true);
  };

  const handleSaveSaleEntry = (data: SaleCommissionEntryFormValues) => {
    if (editingEntryIndex !== null) {
      updateSaleEntry(editingEntryIndex, data);
      toast.success("Sale entry updated!");
    } else {
      appendSaleEntry(data);
      toast.success("Sale entry added!");
    }
    setEditingEntryIndex(null);
    setIsDialogOpen(false);
  };

  const handleDeleteSaleEntry = (index: number) => {
    removeSaleEntry(index);
    toast.success("Sale entry removed.");
  };

  const handleCancel = () => {
    if (mode === "edit" && initialData) {
      const mappedData = mapInitialDataToFormValues(initialData);
      form.reset(mappedData);
    } else {
      form.reset(defaultFormValues);
    }
  };

  const onSubmit = async (values: SalesCommissionFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create" ? "Creating Commission..." : "Updating Commission..."
    );

    try {
      if (mode === "create") {
        await createCommission(
          { values: values },
          {
            onSuccess: () => {
              toast.success("Commission created successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/commissions");
              router.refresh();
              form.reset(defaultFormValues);
            },
            onError: (error) => {
              toast.error(error.message || "Failed to create commission.", {
                id: loadingToastId,
              });
            },
          }
        );
      } else if (mode === "edit" && initialData?.commission?.id) {
        await updateCommission(
          {
            id: initialData.commission.id,
            values,
          },
          {
            onSuccess: () => {
              toast.success("Commission updated successfully!", {
                id: loadingToastId,
              });
              router.push("/accounting-and-finance/commissions");
              router.refresh();
            },
            onError: (error: any) => {
              toast.error(error.message || "Failed to update commission.", {
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

  const getSaleInvoiceNumber = useCallback(
    (saleId: string) => {
      const sale = sales.find((s) => s.sale.id === saleId);
      return sale ? sale.sale.invoiceNumber : "N/A";
    },
    [sales]
  );

  const getSalesAgentName = useCallback(
    (salesAgentId: string) => {
      const agent = salesAgents.find((sa) => sa.salesAgent.id === salesAgentId);
      return agent ? agent.salesAgent.name : "N/A";
    },
    [salesAgents]
  );

  const currentSaleEntryBeingEdited =
    editingEntryIndex !== null ? saleEntryFields[editingEntryIndex] : undefined;

  // Filter available sales based on selected customer and existing sales in form
  const watchCustomerId = form.watch("customerId");

  const filteredSalesForDialog = useMemo(() => {
    if (!watchCustomerId) return [];

    const existingSaleIdsInForm = new Set(
      saleEntryFields.map((field) => field.saleId)
    );

    return sales.filter(
      (sale) =>
        sale.sale.customerId === watchCustomerId &&
        sale.sale.paymentStatus === "paid" &&
        sale.sale.isCommissionApplied === false &&
        (!existingSaleIdsInForm.has(sale.sale.id) ||
          sale.sale.id === currentSaleEntryBeingEdited?.saleId)
    );
  }, [
    sales,
    watchCustomerId,
    saleEntryFields,
    currentSaleEntryBeingEdited?.saleId,
  ]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 text-dark-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-1 flex-row gap-2 items-center">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="commissionRefNumber"
              label="Commission Reference Number"
              placeholder={"Enter commission reference number"}
              disabled={isAnyMutationLoading}
            />
            {mode === "create" && (
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshReffNumber}
                className="self-end shad-primary-btn px-5"
                disabled={isRefetchingReffNumber || isAnyMutationLoading}
              >
                <RefreshCw
                  className={cn(
                    "h-5 w-5",
                    isRefetchingReffNumber && "animate-spin"
                  )}
                />
              </Button>
            )}
          </div>
          <CustomFormField
            fieldType={FormFieldType.DATE_PICKER}
            control={form.control}
            name="commissionDate"
            label="Commission Date"
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
            placeholder="Select a customer"
            disabled={isAnyMutationLoading || saleEntryFields.length > 0}
            key={`customer-${form.watch("customerId") || ""}`}
          >
            {customers.map((customer: Customer) => (
              <SelectItem
                key={customer.id}
                value={customer.id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
              >
                {customer.name}
              </SelectItem>
            ))}
          </CustomFormField>
        </div>

        {/* --- SALES COMMISSION ENTRIES SECTION (represents commission_sales) --- */}
        <div
          className={cn(
            "space-y-5 p-4 rounded-md border bg-white",
            form.formState.errors.saleEntries
              ? "border-red-500"
              : "border-gray-300"
          )}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-blue-800">
              Sales Commission Entries
            </h2>
            <Button
              type="button"
              onClick={handleAddSaleEntry}
              disabled={isAnyMutationLoading || !watchCustomerId}
              className="shad-primary-btn flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Sale Entry
            </Button>
          </div>

          <Table className="shad-table">
            <TableHeader className="bg-blue-800 text-white">
              <TableRow>
                <TableHead className="w-[5%] text-center">#</TableHead>
                <TableHead className="w-[15%]">Invoice</TableHead>
                <TableHead className="w-[15%]">Amount Recv.</TableHead>
                <TableHead className="w-[10%]">Comm. Rate</TableHead>
                <TableHead className="w-[15%]">Gross Comm.</TableHead>
                <TableHead className="w-[15%]">Net Payable</TableHead>
                <TableHead className="w-[15%]">Recipients</TableHead>
                <TableHead className="w-[10%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {saleEntryFields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    {` No sale entries added. Select a customer and click "Add Sale Entry" to start.`}
                  </TableCell>
                </TableRow>
              )}
              {saleEntryFields.map((field, index) => (
                <TableRow
                  key={field.id}
                  className={cn("w-full", { "bg-blue-50": index % 2 === 1 })}
                >
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>
                    {getSaleInvoiceNumber(field.saleId)}
                    {form.formState.errors.saleEntries?.[index]?.saleId && (
                      <p className="shad-error text-xs">
                        {
                          form.formState.errors.saleEntries[index]?.saleId
                            ?.message
                        }
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={field.amountReceived} />
                  </TableCell>
                  <TableCell>{field.commissionRate}%</TableCell>
                  <TableCell>
                    <FormatNumber value={field.grossCommission || 0} />
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={field.totalCommissionPayable || 0} />
                    {form.formState.errors.saleEntries?.[index]
                      ?.totalCommissionPayable && (
                      <p className="shad-error text-xs">
                        {
                          form.formState.errors.saleEntries[index]
                            ?.totalCommissionPayable?.message
                        }
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {field.recipients.map((r, rIndex) => (
                      <div key={rIndex} className="text-sm">
                        <span className="pr-1">
                          {getSalesAgentName(r.salesAgentId)}:
                        </span>
                        <FormatNumber value={r.amount} />

                        {form.formState.errors.saleEntries?.[index]
                          ?.recipients?.[rIndex] && (
                          <p className="shad-error text-xs">
                            {
                              form.formState.errors.saleEntries[index]
                                ?.recipients?.[rIndex]?.salesAgentId?.message
                            }
                          </p>
                        )}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-row items-center gap-1">
                      <span
                        onClick={() => {
                          if (!isAnyMutationLoading) handleEditSaleEntry(index);
                        }}
                        className={cn(
                          "p-1 cursor-pointer",
                          isAnyMutationLoading
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-blue-600 hover:bg-light-200 hover:rounded-md"
                        )}
                      >
                        <EditIcon className="h-5 w-5" />
                      </span>
                      <span
                        onClick={() => {
                          if (!isAnyMutationLoading)
                            handleDeleteSaleEntry(index);
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
              {/* Totals Row */}
              {saleEntryFields.length > 0 && (
                <TableRow className="font-bold bg-blue-100">
                  <TableCell colSpan={4} className="text-right">
                    Total Commission Payable:
                  </TableCell>
                  <TableCell className="text-left">
                    <FormatNumber
                      value={form.watch("totalGrossCommission") || 0}
                    />
                  </TableCell>
                  <TableCell className="text-left">
                    <FormatNumber
                      value={form.watch("totalCommissionPayable") || 0}
                    />
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Display validation error for saleEntries if any */}
          {form.formState.errors.saleEntries && (
            <p className="shad-error text-sm pt-2">
              {form.formState.errors.saleEntries.message ||
                form.formState.errors.saleEntries.root?.message}
            </p>
          )}
        </div>

        {/* --- OVERALL COMMISSION RECIPIENTS SECTION (represents commission_recipients) --- */}
        <div
          className={cn(
            "space-y-3 p-3 rounded-md border bg-white",
            form.formState.errors.overallRecipients
              ? "border-red-500"
              : "border-gray-300"
          )}
        >
          <h4 className="text-xl font-semibold text-blue-800">
            Overall Commission Recipients
          </h4>
          <p className="text-sm text-gray-600">
            This section shows the consolidated commission amounts for each
            sales agent across all added sale entries.
          </p>

          <Table className="shad-table">
            <TableHeader className="bg-blue-800 text-white">
              <TableRow>
                <TableHead className="w-[10%] text-center">#</TableHead>
                <TableHead className="w-[60%]">Sales Agent</TableHead>
                <TableHead className="w-[30%]">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {(form.watch("overallRecipients") || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-3">
                    {` No overall recipients yet. Add sale entries with recipient allocations.`}
                  </TableCell>
                </TableRow>
              )}
              {(form.watch("overallRecipients") || []).map(
                (recipient, index) => (
                  <TableRow
                    key={recipient.salesAgentId} // Use salesAgentId as key as it's a rolled-up view
                    className={cn("w-full", { "bg-blue-50": index % 2 === 1 })}
                  >
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell>
                      {getSalesAgentName(recipient.salesAgentId)}
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={recipient.totalAmount} />
                    </TableCell>
                  </TableRow>
                )
              )}
              <TableRow className="font-bold bg-blue-100">
                <TableCell colSpan={2} className="text-right">
                  Grand Total Distributed:
                </TableCell>
                <TableCell className="text-left">
                  <FormatNumber
                    value={form.watch("totalCommissionPayable") || 0}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {form.formState.errors.overallRecipients && (
            <p className="shad-error text-sm pt-2">
              {form.formState.errors.overallRecipients.message ||
                form.formState.errors.overallRecipients.root?.message}
            </p>
          )}
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="notes"
          label="Internal Notes (Optional)"
          placeholder="Any internal notes or comments for this commission"
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
            disabled={isAnyMutationLoading || saleEntryFields.length === 0}
          >
            {mode === "create" ? "Create Commission" : "Update Commission"}
          </SubmitButton>
        </div>
      </form>

      {/* Sale Entry Dialog */}
      <SaleEntryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveSaleEntry}
        initialSaleEntryData={currentSaleEntryBeingEdited}
        sales={filteredSalesForDialog}
        salesAgents={salesAgents}
        taxes={allTaxes}
      />
    </Form>
  );
};

export default SalesCommissionForm;
