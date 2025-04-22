"use client";

import { useProducts } from "@/hooks/useProducts";
import {
  CustomerFormValues,
  QuotationFormValidation,
  QuotationFormValues,
} from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import DeleteIcon from "@mui/icons-material/Delete";
import SubmitButton from "../SubmitButton";
import { useCustomers } from "@/hooks/useCustomers";
import FormatNumber from "@/components/FormatNumber";
import { useQuotations } from "@/hooks/useQuotations";
import { useRouter } from "next/navigation";
import {
  Customer,
  ProductWithRelations,
  QuotationStatus,
  QuotationWithRelations,
} from "@/types";
import CustomerDialog from "../customers/CustomerDialog";
import { useQuery } from "@tanstack/react-query";
import { generateQuotationNumber } from "@/lib/actions/quotation.actions";

interface QuotationFormProps {
  mode: "create" | "edit";
  initialData?: QuotationWithRelations;
}

const QuotationForm = ({ mode, initialData }: QuotationFormProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { products } = useProducts({ getAllProducts: true });
  const { customers, addCustomer } = useCustomers({ getAllCustomers: true });
  const {
    quotations,
    addQuotation,
    isAddingQuotation,
    editQuotation,
    isEditingQuotation,
  } = useQuotations({
    getAllQuotations: true,
  });

  // Generate quotation number
  const { data: generatedQuotationNumber, isLoading } = useQuery({
    queryKey: ["quotation-number"],
    queryFn: async () => {
      if (mode !== "create") return null;
      const result = await generateQuotationNumber();
      return result;
    },
    enabled: !!mode && mode === "create",
  });

  const router = useRouter();

  const defaultValues = {
    quotationNumber: "",
    quotationDate: new Date(),
    products: [],
    customerId: "",
    status: QuotationStatus.Pending as QuotationStatus,
    notes: "",
    totalAmount: 0,
    totalTaxAmount: 0,
    convertedToSale: false,

    selectedProductId: "",
  };

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(QuotationFormValidation),
    mode: "all",
    defaultValues:
      mode === "create"
        ? defaultValues
        : {
            quotationNumber: initialData?.quotation.quotationNumber,
            quotationDate: new Date(
              initialData?.quotation.quotationDate || Date.now()
            ),
            products:
              initialData?.products.map((product) => ({
                productId: product.productId,
                quantity: product.quantity,
                unitPrice: product.unitPrice,
                totalPrice: product.totalPrice,
                taxAmount: product.taxAmount,
                taxRate: product.taxRate,
                productID: product.productID,
                productName: product.productName,
              })) || [],

            customerId: initialData?.quotation.customerId,
            status: initialData?.quotation.status as QuotationStatus,
            notes: initialData?.quotation.notes,
            totalAmount: initialData?.quotation.totalAmount,
            totalTaxAmount: initialData?.quotation.totalTaxAmount,
            convertedToSale: initialData?.quotation.convertedToSale,

            selectedProductId: "",
          },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedProductId = form.watch("selectedProductId");
  const watchedFields = fields.map((_, index) => ({
    quantity: form.watch(`products.${index}.quantity`),
    unitPrice: form.watch(`products.${index}.unitPrice`),
  }));

  // Set quotation number
  useEffect(() => {
    if (generatedQuotationNumber && mode === "create") {
      form.setValue("quotationNumber", generatedQuotationNumber);
    }
  }, [generatedQuotationNumber, form, mode]);

  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    const selectedProduct: ProductWithRelations = products?.find(
      (product: ProductWithRelations) =>
        product.product.id === selectedProductId
    );

    if (!selectedProduct) {
      toast.error("Selected product not found");
      return;
    }

    if (fields.some((entry) => entry.productId === selectedProductId)) {
      toast.error("This product is already added");
      return;
    }

    append({
      productId: selectedProductId,
      quantity: 0,
      unitPrice: selectedProduct.product.sellingPrice,
      totalPrice: 0,
      taxAmount: 0,
      taxRate: selectedProduct.taxRate.taxRate,
      productID: selectedProduct.product.productID,
      productName: selectedProduct.product.name,
    });
    form.setValue("selectedProductId", "");
  };

  const handleDeleteEntry = (index: number) => {
    remove(index);
  };

  // handle close dialog
  const closeDialog = () => {
    setDialogOpen(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

  const handleAddCustomer = async (data: CustomerFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addCustomer(data, {
        onSuccess: () => {
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  const validateQuotationNumber = (quotationNumber: string) => {
    if (mode === "create") return true;

    const existingQuotation = quotations?.find(
      (quotation: QuotationWithRelations) =>
        quotation.quotation.quotationNumber === quotationNumber
    );

    if (
      mode === "edit" &&
      initialData?.quotation.quotationNumber !== quotationNumber &&
      existingQuotation
    )
      return false;
    return true;
  };

  const handleSubmit = async () => {
    try {
      const values = form.getValues();

      if (fields.length === 0) {
        toast.error("At least one product is required");
        return;
      }

      if (!validateQuotationNumber(values.quotationNumber)) {
        toast.error(
          "A Quotation with the same quotation number already exists."
        );
        return;
      }

      if (mode === "create") {
        await addQuotation(values, {
          onSuccess: () => {
            toast.success("Quotation created successfully!");
            form.reset();
            router.push("/quotations");
          },
          onError: (error) => {
            console.error("Create quotation error:", error);
            toast.error("Failed to create quotation");
          },
        });
      }
      if (mode === "edit" && initialData) {
        await editQuotation(
          { id: initialData?.quotation.id, data: values },
          {
            onSuccess: () => {
              toast.success("Quotation updated successfully!");
              form.reset();
              router.push("/quotations");
            },
            onError: (error) => {
              console.error("Update quotation error:", error);
              toast.error("Failed to update quotation");
            },
          }
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
  };

  const calculateSubTotal = useCallback(() => {
    let calculatedSubTotal = 0;
    fields.forEach((field, index) => {
      const quantity = form.watch(`products.${index}.quantity`) || 0;
      const unitPrice = form.watch(`products.${index}.unitPrice`) || 0;
      const entrySubtotal = quantity * unitPrice;
      calculatedSubTotal += entrySubtotal;
    });
    return calculatedSubTotal;
  }, [fields, form]);

  const calculateTotalAmount = useCallback(() => {
    let calculatedTotal = 0;
    fields.forEach((field, index) => {
      const quantity = form.watch(`products.${index}.quantity`) || 0;
      const unitPrice = form.watch(`products.${index}.unitPrice`) || 0;
      const taxRate = field.taxRate || 0;

      const entrySubtotal = quantity * unitPrice;
      const entryTaxAmount = (entrySubtotal * taxRate) / 100;
      const entryTotal = entrySubtotal + entryTaxAmount;

      calculatedTotal += entryTotal;
    });
    return calculatedTotal;
  }, [fields, form]);

  const calculateTaxAmount = useCallback(() => {
    let calculatedTaxTotal = 0;
    fields.forEach((field, index) => {
      const quantity = form.watch(`products.${index}.quantity`) || 0;
      const unitPrice = form.watch(`products.${index}.unitPrice`) || 0;
      const taxRate = field.taxRate || 0;

      const entrySubtotal = quantity * unitPrice;
      const entryTaxAmount = (entrySubtotal * taxRate) / 100;

      calculatedTaxTotal += entryTaxAmount;
    });
    return calculatedTaxTotal;
  }, [fields, form]);

  useEffect(() => {
    if (fields.length > 0) {
      fields.forEach((field, index) => {
        const quantity = watchedFields[index]?.quantity || 0;
        const unitPrice = watchedFields[index]?.unitPrice || 0;
        const entrySubtotal = quantity * unitPrice;
        const entryTaxAmount = (entrySubtotal * field.taxRate) / 100;
        const entryTotal = entrySubtotal + entryTaxAmount;

        form.setValue(`products.${index}.taxAmount`, entryTaxAmount);
        form.setValue(`products.${index}.totalPrice`, entryTotal);
      });

      form.setValue("totalAmount", calculateTotalAmount());
      form.setValue("totalTaxAmount", calculateTaxAmount());
    }
  }, [watchedFields, fields, form, calculateTotalAmount, calculateTaxAmount]);

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-5 text-dark-500"
        >
          <div className="flex flex-col md:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="quotationNumber"
              label="Quotation Number"
              placeholder={
                isLoading ? "Generating..." : "Enter quotation number"
              }
              disabled={true}
            />
            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="quotationDate"
              label="Quotation Date"
              dateFormat="MM/dd/yyyy"
            />
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="customerId"
              label="Customer"
              placeholder="Select customer"
              key={`customer-select-${form.watch("customerId") || ""}`}
              onAddNew={() => setDialogOpen(true)}
            >
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
            className={`space-y-4 ${
              form.formState.errors.products
                ? "border-2 border-red-500 p-4 rounded-md"
                : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2">
                <CustomFormField
                  fieldType={FormFieldType.SELECT}
                  control={form.control}
                  name="selectedProductId"
                  label="Select Product"
                  placeholder="Select product"
                  onAddNew={() => router.push("/inventory/add-inventory")}
                  key={`product-select-${
                    form.watch("selectedProductId") || ""
                  }`}
                >
                  {products?.map((product: ProductWithRelations) => (
                    <SelectItem
                      key={product.product.id}
                      value={product.product.id}
                      className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                    >
                      {product.product.productID} - {product.product.name}
                    </SelectItem>
                  ))}
                </CustomFormField>
              </div>
              <Button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProductId}
                className="self-end mb-1 shad-primary-btn"
              >
                Add Product
              </Button>
            </div>

            <Table className="shad-table">
              <TableHeader>
                <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                  <TableHead>#</TableHead>
                  <TableHead>PID</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax Rate</TableHead>
                  <TableHead>Tax Amount</TableHead>
                  <TableHead>Sub-Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="w-full bg-white text-blue-800">
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      No products added
                    </TableCell>
                  </TableRow>
                )}
                {fields.map((entry, index) => (
                  <TableRow
                    key={`${entry.productId}-${index}`}
                    className="w-full hover:bg-blue-50"
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{entry.productID}</TableCell>
                    <TableCell>{entry.productName}</TableCell>

                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.NUMBER}
                        control={form.control}
                        name={`products.${index}.quantity`}
                        label=""
                        placeholder="Qty"
                      />
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.AMOUNT}
                        control={form.control}
                        name={`products.${index}.unitPrice`}
                        label=""
                        placeholder="Unit price"
                      />
                    </TableCell>
                    <TableCell>
                      <p>{entry.taxRate}%</p>
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={
                          (form.watch(`products.${index}.unitPrice`) *
                            form.watch(`products.${index}.quantity`) *
                            entry.taxRate) /
                          100
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={
                          form.watch(`products.${index}.quantity`) *
                          form.watch(`products.${index}.unitPrice`)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-row items-center">
                        <span
                          onClick={() => handleDeleteEntry(index)}
                          className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                        >
                          <DeleteIcon className="h-5 w-5" />
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total amount row */}
                {fields.length > 0 && (
                  <>
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-right font-medium text-blue-800 text-[17px] py-4"
                      >
                        Sub Total:
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="font-medium text-blue-800 text-[17px] py-4"
                      >
                        <FormatNumber value={calculateSubTotal()} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-right font-medium text-blue-800 text-[17px] py-4"
                      >
                        Tax Amount:
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="font-medium text-blue-800 text-[17px] py-4"
                      >
                        <FormatNumber value={calculateTaxAmount()} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-right font-semibold text-blue-800 text-[17px] py-4"
                      >
                        Grand Total:
                      </TableCell>
                      <TableCell
                        colSpan={2}
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
          <div className="w-full flex flex-col sm:flex-row gap-5 sm:w-1/2">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="status"
              label="Status"
              placeholder="Select status"
              key={`status-select-${form.watch("status") || ""}`}
            >
              {Object.values(QuotationStatus).map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                >
                  {status}
                </SelectItem>
              ))}
            </CustomFormField>
          </div>

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="notes"
            label="Notes"
            placeholder="Enter quotation notes"
          />

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={() => form.reset()}
              className="shad-danger-btn"
            >
              Cancel
            </Button>
            <SubmitButton
              isLoading={isAddingQuotation || isEditingQuotation}
              className="shad-primary-btn"
            >
              {mode === "create" ? "Create Quotation" : "Update Quotation"}
            </SubmitButton>
          </div>
        </form>
      </Form>
      <CustomerDialog
        mode="add"
        onSubmit={handleAddCustomer}
        open={dialogOpen}
        onOpenChange={closeDialog}
      />
    </>
  );
};

export default QuotationForm;
