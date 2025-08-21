"use client";

import {
  PromissoryNoteFormValidation,
  PromissoryNoteFormValues,
} from "@/lib/validation";
import {
  Customer,
  PromissoryNoteWithRelations,
  SaleItem,
  SaleWithRelations,
} from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Button } from "../ui/button";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useCustomers } from "@/hooks/useCustomers";
import Loading from "../../app/(dashboard)/loading";
import { SelectItem } from "../ui/select";
import { useSales } from "@/hooks/useSales";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Check } from "lucide-react";
import SubmitButton from "../SubmitButton";
import { formatNumber } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import { usePromissoryNote } from "@/hooks/usePromissoryNote";
import { useRouter } from "next/navigation";
import { generatePromissoryNoteRefNumber } from "@/lib/actions/promissoryNote.actions";

interface PromissoryNoteFormProps {
  mode: "create" | "edit";
  initialData?: PromissoryNoteWithRelations;
}

const PromissoryNoteForm = ({ mode, initialData }: PromissoryNoteFormProps) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedSaleId, setPrevSelectedSaleId] = useState<string | null>(
    null
  );

  const router = useRouter();

  const { customers, isLoading: customersLoading } = useCustomers({
    getAllCustomers: true,
  });
  const { sales, isLoading: salesLoading } = useSales({ getAllSales: true });
  const {
    addPromissoryNote,
    editPromissoryNote,
    isAddingPromissoryNote,
    isEditingPromissoryNote,
  } = usePromissoryNote();

  // Generate Promissory note reference number
  const {
    data: generatedPromissoryNoteRefNumber,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["promissory-note-ref-number"],
    queryFn: async () => {
      if (mode !== "create") return null;
      const result = await generatePromissoryNoteRefNumber();
      return result;
    },
    enabled: mode === "create",
  });

  const defaultValues = useMemo(
    () => ({
      promissoryNoteRefNumber: "",
      customerId: "",
      saleId: "",
      promissoryNoteDate: new Date(),
      totalAmount: 0,
      notes: "",
      products: [],
    }),
    []
  );
  const form = useForm<PromissoryNoteFormValues>({
    resolver: zodResolver(PromissoryNoteFormValidation),
    mode: "all",
    defaultValues: initialData
      ? {
          customerId: initialData.promissoryNote.customerId || "",
          saleId: initialData.promissoryNote.saleId || "",
          promissoryNoteRefNumber:
            initialData.promissoryNote.promissoryNoteRefNumber || "",
          promissoryNoteDate: initialData.promissoryNote.promissoryNoteDate
            ? new Date(initialData.promissoryNote.promissoryNoteDate)
            : new Date(),
          totalAmount: initialData.promissoryNote.totalAmount || 0,
          notes: initialData.promissoryNote.notes || "",
          products: initialData?.products || [],
        }
      : defaultValues,
  });

  // Update the refresh button handler (PromissoryNoteRefNumber)
  const handleRefreshPromissoryNoteRefNumber = async () => {
    if (mode === "create") {
      try {
        await refetch();
        if (generatedPromissoryNoteRefNumber) {
          form.setValue(
            "promissoryNoteRefNumber",
            generatedPromissoryNoteRefNumber
          );
        }
      } catch (error) {
        console.error("Error refreshing promissory note ref number:", error);
        toast.error("Failed to refresh promissory note ref number");
      }
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      const values = form.getValues();
      const saleHasPromissoryNote = sales.find(
        (sale: SaleWithRelations) =>
          sale.sale.id === values.saleId &&
          sale.promissoryNote &&
          sale.promissoryNote.id
      );

      if (mode === "create") {
        if (saleHasPromissoryNote) {
          toast.error("This sale already has a promissory note");
          return;
        }

        await addPromissoryNote(
          { data: values },
          {
            onSuccess: () => {
              toast.success("Promissory Note created successfully!");
              form.reset();
              router.push("/promissory-notes");
            },
            onError: (error) => {
              console.error("Create Promissory Note error:", error);
              toast.error("Failed to create Promissory Note");
            },
          }
        );
      } else if (mode === "edit") {
        if (!initialData?.promissoryNote.id) {
          toast.error("Promissory Note ID is required for editing");
          return;
        }
        await editPromissoryNote(
          { id: initialData.promissoryNote.id, data: values },
          {
            onSuccess: () => {
              toast.success("Promissory Note updated successfully!");
              form.reset();
              router.push("/promissory-notes");
            },
            onError: (error) => {
              console.error("Edit Promissory Note error:", error);
              toast.error("Failed to update Promissory Note");
            },
          }
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
  };

  // Update the cancel button handler
  const handleCancel = () => {
    if (mode === "create") {
      form.reset(defaultValues);
      refetch();
    } else {
      form.reset();
    }
  };

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  // Filter sales
  const filteredSales =
    sales?.reduce((acc: SaleWithRelations[], sale: SaleWithRelations) => {
      if (!sale?.sale || !sale?.products) {
        return acc;
      }

      if (mode === "edit") {
        acc.push(sale);
        return acc;
      }

      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          sale.sale.invoiceNumber?.toLowerCase().includes(query) || false;

        if (matchesSearch) {
          acc.push(sale);
        }
      } else {
        acc.push(sale);
      }

      return acc;
    }, []) || [];

  // Handle sale selection.
  const handleSaleSelection = (saleId: string) => {
    if (!saleId) {
      toast.error("Please select a Sale");
      return;
    }
    if (!sales || sales.length === 0) {
      toast.error("No sales available");
      return;
    }
    const selectedSale: SaleWithRelations = sales?.find(
      (sale: SaleWithRelations) => sale.sale.id === saleId
    );

    if (!selectedSale) {
      toast.error("Selected sale not found");
      return;
    }

    // Clear previous products
    remove();

    form.setValue("saleId", selectedSale.sale.id);
    form.setValue("customerId", selectedSale.customer.id);

    // Process products
    if (selectedSale.products.length > 0) {
      selectedSale.products.forEach((product: SaleItem) => {
        const remainingQuantity = product.quantity - product.fulfilledQuantity;

        if (remainingQuantity > 0) {
          append({
            saleItemId: product.id,
            productId: product.productId,
            quantity: remainingQuantity,
            unitPrice: product.unitPrice,
            subTotal: remainingQuantity * product.unitPrice,
            productName: product.productName,
            productID: product.productID,
          });
        }
      });
    }

    // Trigger form validation after a brief delay to ensure state updates
    setTimeout(() => {
      form.trigger(["saleId", "customerId", "products"]);
    }, 100);
  };

  const calculateTotalAmount = useCallback(() => {
    let total = 0;
    fields.forEach((field) => {
      total += field.subTotal;
    });
    return total;
  }, [fields]);

  // set total amount
  useEffect(() => {
    if (fields.length > 0) {
      form.setValue("totalAmount", calculateTotalAmount());
    }
  }, [fields, form, calculateTotalAmount]);

  // Set promissory note ref number
  useEffect(() => {
    if (generatedPromissoryNoteRefNumber && mode === "create") {
      form.setValue(
        "promissoryNoteRefNumber",
        generatedPromissoryNoteRefNumber
      );
    }
  }, [form, mode, generatedPromissoryNoteRefNumber]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5 text-dark-500"
      >
        <div className="w-full flex flex-col md:flex-row gap-5">
          <div className="flex flex-1 flex-row gap-2 items-center">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="promissoryNoteRefNumber"
              label="Promissory Note Reference Number"
              placeholder={
                isLoading || isRefetching
                  ? "Generating..."
                  : "Enter promissory note reference number"
              }
            />
            <Button
              type="button"
              size={"icon"}
              onClick={handleRefreshPromissoryNoteRefNumber}
              className="self-end shad-primary-btn px-5"
              disabled={isLoading || isRefetching}
            >
              <RefreshCw
                className={`h-5 w-5 ${
                  isLoading || isRefetching ? "animate-spin" : ""
                }`}
              />
            </Button>
          </div>
          <CustomFormField
            fieldType={FormFieldType.DATE_PICKER}
            control={form.control}
            name="promissoryNoteDate"
            label="Promissory Note Date"
            dateFormat="MM/dd/yyyy"
          />
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="saleId"
            label="Select Sale"
            placeholder={`${salesLoading ? "Loading..." : "Select sale"}`}
            key={`inventory-select-${form.watch("saleId") || ""}`}
            disabled={!!initialData}
          >
            <div className="py-3">
              <div className="relative flex items-center rounded-md border border-dark-700 bg-white">
                <Search className="ml-2 h-4 w-4 opacity-50" />
                <Input
                  type="text"
                  placeholder="Search by Invoice Number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                  disabled={salesLoading || filteredSales?.length === 0}
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
            {salesLoading ? (
              <div className="py-4">
                <Loading />
              </div>
            ) : filteredSales && filteredSales.length > 0 ? (
              <>
                <Table className="shad-table border border-light-200 rounded-lg">
                  <TableHeader>
                    <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="w-full bg-white">
                    {filteredSales.map((sale: SaleWithRelations) => (
                      <TableRow
                        key={sale.sale.id}
                        className="cursor-pointer hover:bg-blue-50"
                        onClick={() => {
                          setPrevSelectedSaleId(sale.sale.id);
                          setSearchQuery("");
                          handleSaleSelection(sale.sale.id);
                          // Find and click the hidden SelectItem with this value
                          const selectItem = document.querySelector(
                            `[data-value="${sale.sale.id}"]`
                          ) as HTMLElement;
                          if (selectItem) {
                            selectItem.click();
                          }
                        }}
                      >
                        <TableCell>{sale.sale.invoiceNumber}</TableCell>
                        <TableCell>{sale.customer.name}</TableCell>
                        <TableCell className="w-10">
                          {prevSelectedSaleId === sale.sale.id && (
                            <span className="text-blue-800">
                              <Check className="h-5 w-5" />
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Hidden select options for form control */}
                <div className="hidden">
                  {filteredSales.map((sale: SaleWithRelations) => (
                    <SelectItem
                      key={sale.sale.id}
                      value={sale.sale.id}
                      data-value={sale.sale.id}
                    >
                      {sale.sale.invoiceNumber}
                    </SelectItem>
                  ))}
                </div>
              </>
            ) : (
              <SelectItem value="null" disabled>
                <div className="text-red-600">
                  No sales with deliverable products
                </div>
              </SelectItem>
            )}
          </CustomFormField>

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="customerId"
            label="Customer"
            placeholder="Select sale"
            key={`customer-select-${form.watch("customerId") || ""}`}
            disabled
          >
            {customersLoading && (
              <div className="py-4">
                <Loading />
              </div>
            )}
            {customers?.map((customer: Customer) => (
              <SelectItem
                key={customer.id}
                value={customer.id}
                className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
              >
                {customer.name}
              </SelectItem>
            ))}
          </CustomFormField>
        </div>
        <div
          className={`space-y-5 ${
            form.formState.errors.products
              ? "border-2 border-red-500 p-4 rounded-md"
              : ""
          }`}
        >
          <Table className="shad-table">
            <TableHeader>
              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                <TableHead>#</TableHead>
                <TableHead>PID</TableHead>
                <TableHead>Product Description</TableHead>
                <TableHead>Quantity Remaining</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Sub Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {fields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No products available
                  </TableCell>
                </TableRow>
              )}
              {fields.map((entry, index) => {
                return (
                  <TableRow
                    key={`${entry.productId}-${index}`}
                    className={`w-full ${index % 2 === 1 ? "bg-blue-50" : ""}`}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{entry.productID}</TableCell>
                    <TableCell>{entry.productName}</TableCell>

                    <TableCell>
                      {formatNumber(String(entry.quantity))}
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={entry.unitPrice} />
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={entry.subTotal} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Total amount row */}
              {fields.length > 0 && (
                <>
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-right font-semibold text-blue-800 text-[17px] py-4"
                    >
                      {`Grand Total:`}
                    </TableCell>
                    <TableCell
                      colSpan={1}
                      className="font-semibold text-blue-800 text-[17px] py-4"
                    >
                      <FormatNumber value={calculateTotalAmount()} />
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
          {form.formState.errors.products && (
            <p className="shad-error text-xs">
              {form.formState.errors.products.message}
            </p>
          )}
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="notes"
          label="Notes"
          placeholder="Enter promissory notes"
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={handleCancel}
            className="shad-danger-btn"
          >
            Cancel
          </Button>
          <SubmitButton
            isLoading={isAddingPromissoryNote || isEditingPromissoryNote}
            className="shad-primary-btn"
          >
            {mode === "create"
              ? "Create Promissory Note"
              : "Update Promissory Note"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default PromissoryNoteForm;
