/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import {
  SaleCommissionEntryFormValues,
  SaleCommissionEntryValidation,
  CommissionRecipientItemFormValues,
} from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, calculateCommissionAmounts } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import SubmitButton from "../SubmitButton";

import { SaleWithRelations, SalesAgentWithRelations, Tax } from "@/types";
import { Form } from "../ui/form";
import DeleteIcon from "@mui/icons-material/Delete";

interface SaleEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SaleCommissionEntryFormValues) => void;
  initialSaleEntryData?: SaleCommissionEntryFormValues;
  sales: SaleWithRelations[];
  salesAgents: SalesAgentWithRelations[];
  taxes: Tax[];
  existingSaleIds: string[];
}

export const SaleEntryDialog: React.FC<SaleEntryDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSaleEntryData,
  sales,
  salesAgents,
  taxes: allTaxes,
  existingSaleIds,
}) => {
  const form = useForm<SaleCommissionEntryFormValues>({
    resolver: zodResolver(SaleCommissionEntryValidation),
    mode: "all",
    defaultValues: initialSaleEntryData || {
      saleId: "",
      amountReceived: 0,
      additions: 0,
      deductions: 0,
      commissionRate: 0,
      withholdingTaxRate: 0,
      withholdingTaxId: "",
      recipients: [],
    },
  });

  const {
    fields: recipientFields,
    append: appendRecipient,
    remove: removeRecipient,
  } = useFieldArray({
    control: form.control,
    name: "recipients",
  });

  const watchAmountReceived = form.watch("amountReceived");
  const watchAdditions = form.watch("additions");
  const watchDeductions = form.watch("deductions");
  const watchCommissionRate = form.watch("commissionRate");
  const watchWithholdingTaxRate = form.watch("withholdingTaxRate");
  const watchWithholdingTaxId = form.watch("withholdingTaxId");
  const watchSaleId = form.watch("saleId");

  // Effect to set initial data on dialog open or if initialSaleEntryData changes
  useEffect(() => {
    if (isOpen && initialSaleEntryData) {
      form.reset(initialSaleEntryData);
    } else if (isOpen && !initialSaleEntryData) {
      form.reset({
        saleId: "",
        amountReceived: 0,
        additions: 0,
        deductions: 0,
        commissionRate: 0,
        withholdingTaxRate: 0,
        withholdingTaxId: "",
        recipients: [],
      });
    }
  }, [isOpen, initialSaleEntryData, form]);

  // Effect to set initial data on saleId change
  useEffect(() => {
    if (watchSaleId) {
      const sale = sales.find(
        (s: SaleWithRelations) => s.sale.id === watchSaleId
      );
      if (sale) {
        form.setValue("amountReceived", sale.sale.totalAmount, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  }, [watchSaleId, sales, form]);

  // Effect for auto-setting WHT rate based on selected WHT type
  useEffect(() => {
    if (watchWithholdingTaxId) {
      const selectedTax = allTaxes.find(
        (t: Tax) => t.id === watchWithholdingTaxId
      );
      if (selectedTax) {
        form.setValue(
          "withholdingTaxRate",
          parseFloat(selectedTax.taxRate as any),
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        );
      }
    } else {
      form.setValue("withholdingTaxRate", 0, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [watchWithholdingTaxId, allTaxes, form]);

  // Effect for calculating commission amounts
  useEffect(() => {
    const {
      baseForCommission,
      grossCommission,
      withholdingTaxAmount,
      totalCommissionPayable,
    } = calculateCommissionAmounts(
      watchAmountReceived || 0,
      watchAdditions || 0,
      watchDeductions || 0,
      (watchCommissionRate || 0) / 100,
      (watchWithholdingTaxRate || 0) / 100
    );

    form.setValue("baseForCommission", baseForCommission, {
      shouldValidate: false,
      shouldDirty: false,
    });
    form.setValue("grossCommission", grossCommission, {
      shouldValidate: false,
      shouldDirty: false,
    });
    form.setValue("withholdingTaxAmount", withholdingTaxAmount, {
      shouldValidate: false,
      shouldDirty: false,
    });
    form.setValue("totalCommissionPayable", totalCommissionPayable, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [
    watchAmountReceived,
    watchAdditions,
    watchDeductions,
    watchCommissionRate,
    watchWithholdingTaxRate,
    form,
  ]);

  const handleAddRecipient = () => {
    appendRecipient({
      salesAgentId: "",
      amount: 0,
      payingAccountId: "",
    } as CommissionRecipientItemFormValues);
  };

  const onSubmit = (values: SaleCommissionEntryFormValues) => {
    onSave(values);
    form.reset(); // Reset form after saving
    onClose();
  };

  // Filter sales to exclude those already in the main form (unless it's the current entry being edited)
  const availableSales = useMemo(() => {
    const currentSaleId = initialSaleEntryData?.saleId;
    return sales.filter(
      (sale) =>
        !existingSaleIds.includes(sale.sale.id) ||
        sale.sale.id === currentSaleId
    );
  }, [sales, existingSaleIds, initialSaleEntryData?.saleId]);

  const totalDistributed = form
    .watch("recipients")
    ?.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalCommissionPayable = form.watch("totalCommissionPayable") || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-light-200">
        <DialogHeader>
          <DialogTitle>
            {initialSaleEntryData
              ? "Edit Sale Commission Entry"
              : "Add New Sale Commission Entry"}
          </DialogTitle>
          <DialogDescription>
            {initialSaleEntryData
              ? "Modify details for this specific sale's commission."
              : "Fill in the details for a new sale's commission calculation and recipients."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="saleId"
                label="Related Sale (Invoice)"
                placeholder="Select a sale"
              >
                {availableSales.map((sale: SaleWithRelations) => (
                  <SelectItem
                    key={sale.sale.id}
                    value={sale.sale.id}
                    className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                  >
                    {sale.sale.invoiceNumber} -{" "}
                    <FormatNumber value={sale.sale.totalAmount} />
                  </SelectItem>
                ))}
              </CustomFormField>
            </div>

            <h4 className="text-md font-semibold text-blue-800 mt-4">
              Commission Calculation Inputs
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <CustomFormField
                fieldType={FormFieldType.AMOUNT}
                control={form.control}
                name="amountReceived"
                label="Amount Received"
                placeholder="0.00"
              />
              <CustomFormField
                fieldType={FormFieldType.AMOUNT}
                control={form.control}
                name="additions"
                label="Additions"
                placeholder="0.00"
              />
              <CustomFormField
                fieldType={FormFieldType.AMOUNT}
                control={form.control}
                name="deductions"
                label="Deductions"
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <CustomFormField
                fieldType={FormFieldType.NUMBER}
                control={form.control}
                name="commissionRate"
                label="Commission Percentage (%)"
                placeholder="e.g., 10"
              />
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="withholdingTaxId"
                label="Withholding Tax"
                placeholder="Select WHT"
                key={`withholding-tax-${form.watch("withholdingTaxId") || ""}`}
              >
                {allTaxes.map((tax: Tax) => (
                  <SelectItem
                    key={tax.id}
                    value={tax.id}
                    className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                  >
                    {tax.name} ({parseFloat(tax.taxRate as any)}%)
                  </SelectItem>
                ))}
              </CustomFormField>
              <CustomFormField
                fieldType={FormFieldType.NUMBER}
                control={form.control}
                name="withholdingTaxRate"
                label="Withholding Tax Rate (%)"
                placeholder="0"
                disabled={true}
              />
            </div>

            <h4 className="text-md font-semibold text-blue-800 mt-4">
              Calculated Totals
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <CustomFormField
                fieldType={FormFieldType.AMOUNT}
                control={form.control}
                name="baseForCommission"
                label="Base for Commission"
                placeholder="0.00"
                disabled={true}
              />
              <CustomFormField
                fieldType={FormFieldType.AMOUNT}
                control={form.control}
                name="grossCommission"
                label="Gross Commission"
                placeholder="0.00"
                disabled={true}
              />
              <CustomFormField
                fieldType={FormFieldType.AMOUNT}
                control={form.control}
                name="withholdingTaxAmount"
                label="Withholding Tax Amount"
                placeholder="0.00"
                disabled={true}
              />
              <CustomFormField
                fieldType={FormFieldType.AMOUNT}
                control={form.control}
                name="totalCommissionPayable"
                label="Net Commission Payable"
                placeholder="0.00"
                disabled={true}
              />
            </div>

            {/* --- COMMISSION RECIPIENTS SECTION for THIS Sale --- */}
            <div
              className={cn(
                "space-y-3 p-3 rounded-md border",
                form.formState.errors.recipients
                  ? "border-red-500"
                  : "border-gray-300"
              )}
            >
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-blue-800">
                  Commission Recipients (Shares for this Sale)
                </h4>
                <Button
                  type="button"
                  onClick={handleAddRecipient}
                  className="shad-primary-btn flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Recipient
                </Button>
              </div>

              <Table className="shad-table">
                <TableHeader className="bg-blue-800 text-white">
                  <TableRow>
                    <TableHead className="w-[8%] text-center">#</TableHead>
                    <TableHead className="w-[50%]">Sales Agent</TableHead>
                    <TableHead className="">Amount</TableHead>
                    <TableHead className="w-[10%] text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="w-full bg-white text-blue-800">
                  {recipientFields.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-3">
                        {` No recipients added for this sale. Click "Add Recipient".`}
                      </TableCell>
                    </TableRow>
                  )}
                  {recipientFields.map((field, index) => (
                    <TableRow
                      key={field.id}
                      className={cn("w-full", {
                        "bg-blue-50": index % 2 === 1,
                      })}
                    >
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <CustomFormField
                          fieldType={FormFieldType.SELECT}
                          control={form.control}
                          name={`recipients.${index}.salesAgentId`}
                          label=""
                          placeholder="Select sales agent"
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
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-row items-center justify-center">
                          <span
                            onClick={() => removeRecipient(index)}
                            className="p-1 cursor-pointer text-red-600 hover:bg-light-200 hover:rounded-md"
                          >
                            <DeleteIcon className="h-5 w-5" />
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className="text-right font-semibold">
                      Total Distributed:
                    </TableCell>
                    <TableCell colSpan={2} className="font-bold">
                      <FormatNumber value={totalDistributed} /> /{" "}
                      <FormatNumber value={totalCommissionPayable} />
                      {totalDistributed > totalCommissionPayable + 0.01 && (
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
                  {form.formState.errors.recipients.message}
                </p>
              )}
              {form.formState.errors.recipients?.root?.message && (
                <p className="shad-error text-sm pt-2">
                  {form.formState.errors.recipients.root.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <SubmitButton
                isLoading={form.formState.isSubmitting}
                className="shad-primary-btn"
              >
                {initialSaleEntryData ? "Update Entry" : "Add Entry"}
              </SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
