/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  SaleCommissionEntryFormValues,
  SaleCommissionEntryValidation,
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
import { calculateCommissionAmounts } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import SubmitButton from "../SubmitButton";

import { SaleWithRelations, Tax } from "@/types";
import { Form } from "../ui/form";

interface SaleEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SaleCommissionEntryFormValues) => void;
  initialSaleEntryData?: SaleCommissionEntryFormValues;
  sales: SaleWithRelations[];

  taxes: Tax[];
}

export const SaleEntryDialog: React.FC<SaleEntryDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSaleEntryData,
  sales,
  taxes: allTaxes,
}) => {
  const form = useForm<SaleCommissionEntryFormValues>({
    resolver: zodResolver(SaleCommissionEntryValidation),
    mode: "all",
    defaultValues: initialSaleEntryData || {
      id: undefined,
      saleId: "",
      amountReceived: 0,
      additions: 0,
      deductions: 0,
      commissionRate: 0,
      withholdingTaxRate: 0,
      withholdingTaxId: "",
      baseForCommission: 0,
      grossCommission: 0,
      withholdingTaxAmount: 0,
      totalCommissionPayable: 0,
    },
  });

  const watchAmountReceived = form.watch("amountReceived");
  const watchAdditions = form.watch("additions");
  const watchDeductions = form.watch("deductions");
  const watchCommissionRate = form.watch("commissionRate");
  const watchWithholdingTaxRate = form.watch("withholdingTaxRate");
  const watchWithholdingTaxId = form.watch("withholdingTaxId");
  const watchSaleId = form.watch("saleId");

  useEffect(() => {
    if (isOpen) {
      if (initialSaleEntryData) {
        form.reset(initialSaleEntryData);
      } else {
        form.reset({
          id: undefined,
          saleId: "",
          amountReceived: 0,
          additions: 0,
          deductions: 0,
          commissionRate: 0,
          withholdingTaxRate: 0,
          withholdingTaxId: "",
          baseForCommission: 0,
          grossCommission: 0,
          withholdingTaxAmount: 0,
          totalCommissionPayable: 0,
        });
      }
    }
  }, [isOpen, initialSaleEntryData, form]);

  // Effect to set saleAmount and amountReceived on saleId change
  useEffect(() => {
    if (watchSaleId) {
      const sale = sales.find(
        (s: SaleWithRelations) => s.sale.id === watchSaleId
      );
      if (sale) {
        form.setValue(
          "amountReceived",
          parseFloat(sale.sale.totalAmount as any) || 0,
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        );
      }
    } else {
      form.setValue("amountReceived", 0);
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

  const onSubmit = (values: SaleCommissionEntryFormValues) => {
    onSave(values);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-light-200">
        <DialogHeader>
          <DialogTitle>
            {initialSaleEntryData?.id
              ? "Edit Sale Commission Entry"
              : "Add New Sale Commission Entry"}
          </DialogTitle>
          <DialogDescription>
            {initialSaleEntryData?.id
              ? "Modify details for this specific sale's commission."
              : "Fill in the details for a new sale's commission calculation."}
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
                disabled={!!initialSaleEntryData?.id}
              >
                {sales.map((sale: SaleWithRelations) => (
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
                label="Withholding Tax Type"
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
              Calculated Totals (for this Sale Entry)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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

            <DialogFooter>
              <Button
                type="button"
                className="shad-danger-btn"
                onClick={onClose}
              >
                Cancel
              </Button>
              <SubmitButton
                isLoading={form.formState.isSubmitting}
                className="shad-primary-btn"
              >
                {initialSaleEntryData?.id ? "Update Entry" : "Add Entry"}
              </SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
