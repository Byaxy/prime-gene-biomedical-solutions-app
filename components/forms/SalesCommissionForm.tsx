/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCommissions } from "@/hooks/useCommissions";
import {
  CommissionRecipientItemFormValues,
  SaleCommissionEntryFormValues,
  SalesCommissionFormValidation,
  SalesCommissionFormValues,
} from "@/lib/validation";
import {
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
import { calculateCommissionAmounts, cn, parseServerError } from "@/lib/utils";
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

  const defaultFormValues: SalesCommissionFormValues = useMemo(
    () => ({
      commissionRefNumber: generatedCommissionRefNumber || "",
      commissionDate: new Date(),
      customerId: "",
      commissionSales: [],
      notes: "",
      totalAmountReceived: 0,
      totalAdditions: 0,
      totalDeductions: 0,
      totalBaseForCommission: 0,
      totalGrossCommission: 0,
      totalWithholdingTaxAmount: 0,
      totalCommissionPayable: 0,
      recipients: [],
    }),
    [generatedCommissionRefNumber]
  );

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
    name: "commissionSales",
  });

  const {
    fields: recipientFields,
    append: appendRecipient,
    remove: removeRecipient,
    update: updateRecipient,
  } = useFieldArray({
    control: form.control,
    name: "recipients",
  });

  const isAnyMutationLoading = isCreatingCommission || isUpdatingCommission;

  const watchCommissionSales = form.watch("commissionSales");

  // --- Effect to initialize form in EDIT mode ---
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const commissionSales = initialData.commissionSales;

      form.setValue(
        "commissionRefNumber",
        initialData.commission.commissionRefNumber
      );
      form.setValue(
        "commissionDate",
        new Date(initialData.commission.commissionDate)
      );
      form.setValue("customerId", initialData.commission.customerId);
      form.setValue("notes", initialData.commission.notes || "");
      form.setValue(
        "totalAmountReceived",
        initialData.commission.totalAmountReceived
      );
      form.setValue("totalAdditions", initialData.commission.totalAdditions);
      form.setValue("totalDeductions", initialData.commission.totalDeductions);
      form.setValue(
        "totalBaseForCommission",
        initialData.commission.totalBaseForCommission
      );
      form.setValue(
        "totalGrossCommission",
        initialData.commission.totalGrossCommission
      );
      form.setValue(
        "totalWithholdingTaxAmount",
        initialData.commission.totalWithholdingTaxAmount
      );
      form.setValue(
        "totalCommissionPayable",
        initialData.commission.totalCommissionPayable
      );

      // Populate commissionSales
      const initialCommissionSales: SaleCommissionEntryFormValues[] =
        commissionSales.map((cs) => {
          const commissionSaleData = cs.commissionSale;
          const {
            baseForCommission,
            grossCommission,
            withholdingTaxAmount,
            totalCommissionPayable,
          } = calculateCommissionAmounts(
            parseFloat(commissionSaleData?.amountReceived as any) || 0,
            parseFloat(commissionSaleData?.additions as any) || 0,
            parseFloat(commissionSaleData?.deductions as any) || 0,
            parseFloat(commissionSaleData?.commissionRate as any) / 100 || 0,
            parseFloat(commissionSaleData?.withholdingTaxRate as any) / 100 || 0
          );

          return {
            id: commissionSaleData?.id,
            saleId: commissionSaleData?.saleId,
            amountReceived: parseFloat(
              commissionSaleData?.amountReceived as any
            ),
            additions: parseFloat(commissionSaleData?.additions as any),
            deductions: parseFloat(commissionSaleData?.deductions as any),
            commissionRate: parseFloat(
              commissionSaleData?.commissionRate as any
            ),
            withholdingTaxRate:
              parseFloat(commissionSaleData?.withholdingTaxRate as any) || 0,
            withholdingTaxId: commissionSaleData?.withholdingTaxId || "",
            baseForCommission: baseForCommission,
            grossCommission: grossCommission,
            withholdingTaxAmount: withholdingTaxAmount,
            totalCommissionPayable: totalCommissionPayable,
          };
        });

      form.setValue("commissionSales", initialCommissionSales, {
        shouldValidate: true,
      });

      // Populate recipients
      const initialRecipients: CommissionRecipientItemFormValues[] =
        initialData.recipients.map((r) => ({
          id: r?.recipient.id,
          salesAgentId: r?.recipient.salesAgentId,
          amount: parseFloat(r?.recipient.amount as any),
        }));

      form.setValue("recipients", initialRecipients, {
        shouldValidate: true,
      });

      form.reset(form.getValues());
    }
  }, [mode, initialData, form]);

  useEffect(() => {
    let grandTotalAmountReceived = 0;
    let grandTotalAdditions = 0;
    let grandTotalDeductions = 0;
    let grandTotalBaseForCommission = 0;
    let grandTotalGrossCommission = 0;
    let grandTotalWithholdingTaxAmount = 0;
    let grandTotalCommissionPayable = 0;

    watchCommissionSales.forEach((entry) => {
      grandTotalAmountReceived += entry.amountReceived || 0;
      grandTotalAdditions += entry.additions || 0;
      grandTotalDeductions += entry.deductions || 0;
      grandTotalBaseForCommission += entry.baseForCommission || 0;
      grandTotalGrossCommission += entry.grossCommission || 0;
      grandTotalWithholdingTaxAmount += entry.withholdingTaxAmount || 0;
      grandTotalCommissionPayable += entry.totalCommissionPayable || 0;
    });

    form.setValue("totalAmountReceived", grandTotalAmountReceived, {
      shouldValidate: false,
    });
    form.setValue("totalAdditions", grandTotalAdditions, {
      shouldValidate: false,
    });
    form.setValue("totalDeductions", grandTotalDeductions, {
      shouldValidate: false,
    });
    form.setValue("totalBaseForCommission", grandTotalBaseForCommission, {
      shouldValidate: false,
    });
    form.setValue("totalGrossCommission", grandTotalGrossCommission, {
      shouldValidate: false,
    });
    form.setValue("totalWithholdingTaxAmount", grandTotalWithholdingTaxAmount, {
      shouldValidate: false,
    });
    form.setValue("totalCommissionPayable", grandTotalCommissionPayable, {
      shouldValidate: true,
    });
  }, [watchCommissionSales, form, updateRecipient]);

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

  // NEW: Functions for managing overall recipients
  const handleAddRecipient = () => {
    appendRecipient({
      salesAgentId: "",
      amount: 0,
    } as CommissionRecipientItemFormValues);
  };

  const handleDeleteRecipient = (index: number) => {
    removeRecipient(index);
    toast.success("Recipient removed from overall allocation.");
  };

  const handleCancel = () => {
    form.reset();
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
              toast.error(parseServerError(error), {
                id: loadingToastId,
                duration: 6000,
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
            onError: (error) => {
              toast.error(parseServerError(error), {
                id: loadingToastId,
                duration: 6000,
              });
            },
          }
        );
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(parseServerError(error), {
        id: loadingToastId,
        duration: 6000,
      });
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const getSaleInvoiceNumber = useCallback(
    (saleId: string) => {
      const sale = sales.find((s) => s.sale.id === saleId);
      return sale ? sale.sale.invoiceNumber : "N/A";
    },
    [sales]
  );

  const currentSaleEntryBeingEdited =
    editingEntryIndex !== null ? saleEntryFields[editingEntryIndex] : undefined;

  const watchCustomerId = form.watch("customerId");

  const filteredSalesForDialog = useMemo(() => {
    if (!watchCustomerId) return [];

    const existingSaleIdsInForm = new Set(
      saleEntryFields.map((field) => field.saleId)
    );

    const initialDataSaleIds = new Set(
      mode === "edit" && initialData
        ? initialData.commissionSales.map((cs) => cs?.commissionSale.saleId)
        : []
    );

    return sales.filter(
      (sale) =>
        sale.sale.customerId === watchCustomerId &&
        sale.sale.paymentStatus === "paid" &&
        (sale.sale.isCommissionApplied === false ||
          initialDataSaleIds.has(sale.sale.id)) &&
        (!existingSaleIdsInForm.has(sale.sale.id) ||
          sale.sale.id === currentSaleEntryBeingEdited?.saleId)
    );
  }, [
    sales,
    watchCustomerId,
    saleEntryFields,
    currentSaleEntryBeingEdited?.saleId,
    mode,
    initialData,
  ]);

  const filteredCustomers = useMemo(() => {
    const existingSaleIdsInForm = new Set(
      saleEntryFields.map((field) => field.saleId)
    );

    const customerSalesMap = new Map<string, SaleWithRelations[]>();

    sales.forEach((sale) => {
      if (
        sale.sale.paymentStatus === "paid" &&
        (sale.sale.isCommissionApplied === false ||
          existingSaleIdsInForm.has(sale.sale.id))
      ) {
        const customerId = sale.sale.customerId;
        if (!customerSalesMap.has(customerId)) {
          customerSalesMap.set(customerId, []);
        }
        customerSalesMap.get(customerId)!.push(sale);
      }
    });

    if (mode === "edit" && initialData?.commission?.customerId) {
      const initialCustomerId = initialData.commission.customerId;
      if (!customerSalesMap.has(initialCustomerId)) {
        customerSalesMap.set(initialCustomerId, []);
      }
    }

    return customers.filter((customer) => {
      const customerSales = customerSalesMap.get(customer.id);
      return customerSales !== undefined;
    });
  }, [sales, customers, saleEntryFields, mode, initialData]);

  // Calculate total allocated to overall recipients for display/validation

  const totalAllocatedToRecipients = form
    .watch("recipients")
    ?.reduce((sum, r) => sum + (r.amount || 0), 0);

  const totalCommissionPayable = form.watch("totalCommissionPayable") || 0;

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
            disabled={
              isAnyMutationLoading ||
              saleEntryFields.length > 0 ||
              mode === "edit"
            }
            key={`customer-${form.watch("customerId") || ""}`}
          >
            {filteredCustomers.map((customer: Customer) => (
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
            form.formState.errors.commissionSales
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
                <TableHead className="w-[10%]">Invoice No.</TableHead>
                <TableHead className="w-[10%]">Amount Recv.</TableHead>
                <TableHead className="w-[8%]">Comm. Rate</TableHead>
                <TableHead className="w-[7%]">WHT Rate</TableHead>
                <TableHead className="w-[8%]">WHT Amount</TableHead>
                <TableHead className="w-[8%]">Gross Comm.</TableHead>
                <TableHead className="w-[8%]">Additions</TableHead>
                <TableHead className="w-[8%]">Deductions</TableHead>
                <TableHead className="w-[8%]">Net Payable</TableHead>
                {/* Removed Recipients column here as it's now overall */}
                <TableHead className="w-[5%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {saleEntryFields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-4">
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
                    {form.formState.errors.commissionSales?.[index]?.saleId && (
                      <p className="shad-error text-xs">
                        {
                          form.formState.errors.commissionSales[index]?.saleId
                            ?.message
                        }
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={field.amountReceived} />
                  </TableCell>
                  <TableCell>{field.commissionRate}%</TableCell>
                  <TableCell>{field.withholdingTaxRate}%</TableCell>
                  <TableCell>
                    <FormatNumber value={field.withholdingTaxAmount || 0} />
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={field.grossCommission || 0} />
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={field.additions || 0} />
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={field.deductions || 0} />
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={field.totalCommissionPayable || 0} />
                    {form.formState.errors.commissionSales?.[index]
                      ?.totalCommissionPayable && (
                      <p className="shad-error text-xs">
                        {
                          form.formState.errors.commissionSales[index]
                            ?.totalCommissionPayable?.message
                        }
                      </p>
                    )}
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
                  <TableCell colSpan={9} className="text-right">
                    Total Commission Payable:
                  </TableCell>
                  <TableCell className="text-left">
                    <FormatNumber value={totalCommissionPayable} />
                  </TableCell>
                  <TableCell colSpan={1}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Display validation error for commissionSales if any */}
          {form.formState.errors.commissionSales && (
            <p className="shad-error text-sm pt-2">
              {form.formState.errors.commissionSales.message ||
                form.formState.errors.commissionSales.root?.message}
            </p>
          )}
        </div>

        {/* --- OVERALL COMMISSION RECIPIENTS SECTION (NOW PRIMARY) --- */}
        <div
          className={cn(
            "space-y-3 p-3 rounded-md border bg-white",
            form.formState.errors.recipients
              ? "border-red-500"
              : "border-gray-300"
          )}
        >
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-semibold text-blue-800">
              Overall Commission Recipients
            </h4>
            <Button
              type="button"
              onClick={handleAddRecipient}
              className="shad-primary-btn flex items-center gap-2"
              disabled={isAnyMutationLoading || totalCommissionPayable === 0}
            >
              <Plus className="h-4 w-4" /> Add Recipient
            </Button>
          </div>

          <p className="text-sm text-gray-600">
            Allocate the total commission payable (
            <FormatNumber value={totalCommissionPayable} />) among sales agents.
          </p>

          <Table className="shad-table">
            <TableHeader className="bg-blue-800 text-white">
              <TableRow>
                <TableHead className="w-[8%] text-center">#</TableHead>
                <TableHead className="w-[50%]">Sales Agent</TableHead>
                <TableHead className="">Amount</TableHead>
                <TableHead className="w-[10%] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {recipientFields.length === 0 && (
                <TableRow key={"no-recipients"}>
                  <TableCell colSpan={4} className="text-center py-3">
                    {` No overall recipients yet. Add sales entries and then click "Add Recipient" to allocate.`}
                  </TableCell>
                </TableRow>
              )}
              {recipientFields.map((field, index) => (
                <TableRow
                  key={field.id}
                  className={cn("w-full", { "bg-blue-50": index % 2 === 1 })}
                >
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={form.control}
                      name={`recipients.${index}.salesAgentId`}
                      label=""
                      placeholder="Select sales agent"
                      disabled={isAnyMutationLoading}
                      key={`recipient-${index}-${field.salesAgentId || ""}`}
                    >
                      {salesAgents.map((agent: SalesAgentWithRelations) => (
                        <SelectItem
                          key={agent.salesAgent.id}
                          value={agent.salesAgent.id}
                          className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                        >
                          {agent.salesAgent.name}
                        </SelectItem>
                      ))}
                    </CustomFormField>
                  </TableCell>
                  <TableCell>
                    <CustomFormField
                      fieldType={FormFieldType.AMOUNT}
                      control={form.control}
                      name={`recipients.${index}.amount`}
                      label=""
                      placeholder="0.00"
                      disabled={isAnyMutationLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-row items-center justify-center">
                      <span
                        onClick={() => {
                          if (!isAnyMutationLoading)
                            handleDeleteRecipient(index);
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

              <TableRow className="font-bold bg-blue-100 mt-2">
                <TableCell colSpan={2} className="text-right font-semibold">
                  Total Distributed:
                </TableCell>
                <TableCell colSpan={2} className="font-bold">
                  <FormatNumber value={totalAllocatedToRecipients} /> /{" "}
                  <FormatNumber value={totalCommissionPayable} />
                  {totalAllocatedToRecipients >
                    totalCommissionPayable + 0.01 && (
                    <p className="text-red-500 text-xs">
                      Total distributed exceeds commission payable!
                    </p>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {form.formState.errors.recipients && (
            <p className="shad-error text-sm pt-2">
              {form.formState.errors.recipients.message ||
                form.formState.errors.recipients.root?.message}
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
        taxes={allTaxes}
      />
    </Form>
  );
};

export default SalesCommissionForm;
