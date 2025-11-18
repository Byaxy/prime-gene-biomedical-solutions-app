/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCommissions } from "@/hooks/useCommissions";
import {
  SaleCommissionEntryFormValues,
  SalesCommissionFormValidation,
  SalesCommissionFormValues,
} from "@/lib/validation";
import {
  CommissionRecipientWithRelations,
  CommissionWithRelations,
  SalesAgentWithRelations,
  SaleWithRelations,
  Tax,
} from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

interface SalesCommissionFormProps {
  mode: "create" | "edit";
  initialData?: CommissionWithRelations;
  sales: SaleWithRelations[];
  salesAgents: SalesAgentWithRelations[];
  taxes: Tax[];
}
const SalesCommissionForm = ({
  mode,
  initialData,
  sales,
  salesAgents,
  taxes: allTaxes,
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

  const mapInitialDataToFormValues = useCallback(
    (data: CommissionWithRelations): SalesCommissionFormValues => {
      if (!data?.commission) {
        return {
          commissionDate: new Date(),
          saleEntries: [],
          notes: "",
        };
      }

      // Extract values from the top-level commission and its direct relations
      const commission = data.commission;
      const withholdingTax = data.withholdingTax;
      const recipients = data.recipients || [];

      // Re-calculate the fields for this single sale entry
      const {
        baseForCommission,
        grossCommission,
        withholdingTaxAmount,
        totalCommissionPayable,
      } = calculateCommissionAmounts(
        parseFloat(commission.amountReceived as any) || 0,
        parseFloat(commission.additions as any) || 0,
        parseFloat(commission.deductions as any) || 0,
        parseFloat(commission.commissionRate as any) / 100 || 0,
        parseFloat(commission.withholdingTaxRate as any) / 100 ||
          parseFloat(withholdingTax?.taxRate as any) / 100 ||
          0
      );

      // Create the single sale entry from the initialData
      const singleSaleEntry: SaleCommissionEntryFormValues = {
        saleId: commission.saleId,
        amountReceived: parseFloat(commission.amountReceived as any) || 0,
        additions: parseFloat(commission.additions as any) || 0,
        deductions: parseFloat(commission.deductions as any) || 0,
        commissionRate: parseFloat(commission.commissionRate as any) || 0,
        withholdingTaxRate:
          parseFloat(commission.withholdingTaxRate as any) ||
          parseFloat(withholdingTax?.taxRate as any) ||
          0,
        withholdingTaxId: commission.withholdingTaxId || null,

        // Calculated fields
        baseForCommission: baseForCommission,
        grossCommission: grossCommission,
        withholdingTaxAmount: withholdingTaxAmount,
        totalCommissionPayable: totalCommissionPayable,

        // Map the direct recipients to the single sale entry
        recipients: recipients.map((r: CommissionRecipientWithRelations) => ({
          id: r.recipient.id,
          salesAgentId: r.recipient.salesAgentId,
          amount: parseFloat(r.recipient.amount as any) || 0,
          payingAccountId: r.recipient.payingAccountId || "",
        })),
      };

      return {
        commissionDate: new Date(commission.commissionDate),
        notes: commission.notes || "",
        saleEntries: [singleSaleEntry],
      };
    },
    []
  );

  const defaultFormValues = useMemo<SalesCommissionFormValues>(() => {
    return {
      commissionDate: new Date(),
      saleEntries: [],
      notes: "",
    };
  }, []);

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

  // Initialize form with initialData in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const mappedData = mapInitialDataToFormValues(initialData);
      form.reset(mappedData);
    }
  }, [initialData, mode, form, defaultFormValues, mapInitialDataToFormValues]);

  const handleAddSaleEntry = () => {
    setEditingEntryIndex(null); // Ensure we are adding, not editing
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
    setEditingEntryIndex(null); // Reset editing state
    setIsDialogOpen(false); // Close the dialog
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
    router.back();
  };

  const onSubmit = async (values: SalesCommissionFormValues) => {
    const loadingToastId = toast.loading(
      mode === "create" ? "Creating Commission..." : "Updating Commission..."
    );

    try {
      if (mode === "create") {
        await createCommission(
          { values: values }, // Pass values directly now
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

  const existingSaleIdsForDialog = useMemo(() => {
    return saleEntryFields.map((field) => field.saleId);
  }, [saleEntryFields]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 text-dark-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CustomFormField
            fieldType={FormFieldType.DATE_PICKER}
            control={form.control}
            name="commissionDate"
            label="Commission Date"
            dateFormat="MM/dd/yyyy"
            disabled={isAnyMutationLoading}
          />
        </div>

        {/* --- SALE ENTRIES SECTION --- */}
        <div
          className={cn(
            "space-y-5 p-4 rounded-md border",
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
              disabled={isAnyMutationLoading}
              className="shad-primary-btn flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Sale Entry
            </Button>
          </div>

          <Table className="shad-table">
            <TableHeader className="bg-blue-800 text-white">
              <TableRow>
                <TableHead className="w-[5%] text-center">#</TableHead>
                <TableHead className="w-[20%]">Invoice</TableHead>
                <TableHead className="w-[15%]">Amount Recv.</TableHead>
                <TableHead className="w-[15%]">Comm. Rate</TableHead>
                <TableHead className="w-[15%]">Net Payable</TableHead>
                <TableHead className="w-[20%]">Recipients</TableHead>
                <TableHead className="w-[10%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {saleEntryFields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    {` No sale entries added. Click "Add Sale Entry" to start.`}
                  </TableCell>
                </TableRow>
              )}
              {saleEntryFields.map((field, index) => (
                <TableRow
                  key={field.id}
                  className={cn("w-full", { "bg-blue-50": index % 2 === 1 })}
                >
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell>{getSaleInvoiceNumber(field.saleId)}</TableCell>
                  <TableCell>
                    <FormatNumber value={field.amountReceived} />
                  </TableCell>
                  <TableCell>{field.commissionRate}%</TableCell>
                  <TableCell>
                    <FormatNumber value={field.totalCommissionPayable || 0} />
                  </TableCell>
                  <TableCell>
                    {field.recipients.map((r, rIndex) => (
                      <div key={rIndex} className="text-xs">
                        {getSalesAgentName(r.salesAgentId)}:{" "}
                        <FormatNumber value={r.amount} />
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
            disabled={isAnyMutationLoading}
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
        sales={sales}
        salesAgents={salesAgents}
        taxes={allTaxes}
        existingSaleIds={existingSaleIdsForDialog}
      />
    </Form>
  );
};

export default SalesCommissionForm;
