"use client";

import { useProducts } from "@/hooks/useProducts";
import {
  CustomerFormValues,
  QuotationFormValidation,
  QuotationFormValues,
  TaxFormValues,
} from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Form, FormControl } from "../ui/form";
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
  Attachment,
  Customer,
  ProductWithRelations,
  QuotationStatus,
  QuotationWithRelations,
  Tax,
} from "@/types";
import CustomerDialog from "../customers/CustomerDialog";
import { useQuery } from "@tanstack/react-query";
import { generateQuotationNumber } from "@/lib/actions/quotation.actions";
import { RefreshCw } from "lucide-react";
import { useTaxes } from "@/hooks/useTaxes";
import TaxDialog from "../taxes/TaxDialog";
import Loading from "../loading";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { FileUploader } from "../FileUploader";
import ProductSheet from "../products/ProductSheet";

interface QuotationFormProps {
  mode: "create" | "edit";
  initialData?: QuotationWithRelations;
}

const QuotationForm = ({ mode, initialData }: QuotationFormProps) => {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const { companySettings } = useCompanySettings();

  const { products, isLoading: productsLoading } = useProducts({
    getAllProducts: true,
  });
  const {
    customers,
    addCustomer,
    isLoading: customersLoading,
  } = useCustomers({ getAllCustomers: true });
  const {
    taxes,
    isLoading: taxesLoading,
    addTax,
    isAddingTax,
  } = useTaxes({ getAllTaxes: true });
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
  const {
    data: generatedQuotationNumber,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["quotation-number"],
    queryFn: async () => {
      if (mode !== "create") return null;
      const result = await generateQuotationNumber();
      return result;
    },
    enabled: mode === "create",
  });

  const router = useRouter();

  const defaultValues = {
    quotationNumber: generatedQuotationNumber || "",
    rfqNumber: "",
    taxRateId: "",
    discountRate: 0,
    discountAmount: 0,
    quotationDate: new Date(),
    products: [],
    customerId: "",
    status: QuotationStatus.Pending as QuotationStatus,
    notes: "",
    totalAmount: 0,
    totalTaxAmount: 0,
    convertedToSale: false,
    attachments: [],

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
            rfqNumber: initialData?.quotation.rfqNumber,
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
                discountRate: product.discountRate,
                discountAmount: product.discountAmount,
                productID: product.productID,
                productName: product.productName,
              })) || [],

            customerId: initialData?.quotation.customerId,
            taxRateId: initialData?.quotation.taxRateId,
            discountRate: initialData?.quotation.discountRate,
            discountAmount: initialData?.quotation.discountAmount,
            status: initialData?.quotation.status as QuotationStatus,
            notes: initialData?.quotation.notes,
            totalAmount: initialData?.quotation.totalAmount,
            totalTaxAmount: initialData?.quotation.totalTaxAmount,
            convertedToSale: initialData?.quotation.convertedToSale,
            attachments: initialData?.quotation.attachments,

            selectedProductId: "",
          },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedProductId = form.watch("selectedProductId");
  const selectedTaxRateId = form.watch("taxRateId");
  const watchedFields = fields.map((_, index) => ({
    quantity: form.watch(`products.${index}.quantity`),
    unitPrice: form.watch(`products.${index}.unitPrice`),
  }));

  const selectedTax: Tax = taxes?.find(
    (tax: Tax) => tax.id === selectedTaxRateId
  );

  // Set quotation number
  useEffect(() => {
    if (generatedQuotationNumber && mode === "create") {
      form.setValue("quotationNumber", generatedQuotationNumber);
    }
  }, [generatedQuotationNumber, form, mode]);

  // Update the refresh button handler
  const handleRefreshQuotationNumber = async () => {
    if (mode === "create") {
      try {
        await refetch();
        if (generatedQuotationNumber) {
          form.setValue("quotationNumber", generatedQuotationNumber);
        }
      } catch (error) {
        console.error("Error refreshing quotation number:", error);
        toast.error("Failed to refresh quotation number");
      }
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
      subTotal: 0,
      taxAmount: 0,
      taxRate: selectedTax ? selectedTax.taxRate : 0,
      discountRate: form.watch("discountRate") || 0,
      discountAmount: 0,
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
    setCustomerDialogOpen(false);
    setTaxDialogOpen(false);
    setProductDialogOpen(false);

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

  const handleAddTax = async (data: TaxFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addTax(data, {
        onSuccess: () => {
          closeDialog();
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  const validateQuotationNumber = (quotationNumber: string) => {
    const existingQuotation = quotations?.find(
      (quotation: QuotationWithRelations) =>
        quotation.quotation.quotationNumber === quotationNumber
    );
    if (mode === "create" && existingQuotation) return false;

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
        if (initialData?.quotation.attachments?.length > 0) {
          const prevIds = initialData?.quotation.attachments.map(
            (attachment: Attachment) => attachment.id
          );
          await editQuotation(
            {
              id: initialData?.quotation.id,
              data: values,
              prevAttachmentIds: prevIds,
            },
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
        } else {
          await editQuotation(
            {
              id: initialData?.quotation.id,
              data: values,
            },
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
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
  };

  // Calculate raw subtotal (before any discounts)
  const calculateRawSubTotal = useCallback(() => {
    let calculatedSubTotal = 0;
    fields.forEach((field, index) => {
      const quantity = form.watch(`products.${index}.quantity`) || 0;
      const unitPrice = form.watch(`products.${index}.unitPrice`) || 0;
      calculatedSubTotal += quantity * unitPrice;
    });
    return calculatedSubTotal;
  }, [fields, form]);

  // Calculate discount amount
  const calculateDiscountAmount = useCallback(() => {
    const subTotal = calculateRawSubTotal();
    const discountRate = form.watch("discountRate") || 0;
    return subTotal * (discountRate / 100);
  }, [calculateRawSubTotal, form]);

  // Calculate taxable amount (subtotal - discount)
  const calculateTaxableAmount = useCallback(() => {
    return calculateRawSubTotal() - calculateDiscountAmount();
  }, [calculateRawSubTotal, calculateDiscountAmount]);

  // Calculate tax amount (taxable amount * tax rate)
  const calculateTaxAmount = useCallback(() => {
    const taxableAmount = calculateTaxableAmount();
    const taxRate = selectedTax?.taxRate || 0;
    return (taxableAmount * taxRate) / 100;
  }, [calculateTaxableAmount, selectedTax]);

  // Calculate grand total (taxable amount + tax)
  const calculateTotalAmount = useCallback(() => {
    return calculateTaxableAmount() + calculateTaxAmount();
  }, [calculateTaxableAmount, calculateTaxAmount]);

  useEffect(() => {
    if (fields.length > 0) {
      fields.forEach((field, index) => {
        const quantity = watchedFields[index]?.quantity || 0;
        const unitPrice = watchedFields[index]?.unitPrice || 0;
        const entrySubtotal = quantity * unitPrice;
        const taxRate = selectedTax?.taxRate || 0;
        const entryTaxAmount = (entrySubtotal * taxRate) / 100;
        const entryDiscountAmount =
          (entrySubtotal * form.watch("discountRate")) / 100;
        const entryTaxableAmount = entrySubtotal - entryDiscountAmount;
        const entryTotal = entryTaxableAmount + entryTaxAmount;

        form.setValue(`products.${index}.discountAmount`, entryDiscountAmount);
        form.setValue(
          `products.${index}.discountRate`,
          form.watch("discountRate") || 0
        );
        form.setValue(`products.${index}.subTotal`, entryTaxableAmount);
        form.setValue(`products.${index}.taxRate`, taxRate);
        form.setValue(`products.${index}.taxAmount`, entryTaxAmount);
        form.setValue(`products.${index}.totalPrice`, entryTotal);
      });

      form.setValue("discountAmount", calculateDiscountAmount());
      form.setValue("totalAmount", calculateTotalAmount());
      form.setValue("totalTaxAmount", calculateTaxAmount());
    }
  }, [
    watchedFields,
    fields,
    form,
    calculateTotalAmount,
    calculateTaxAmount,
    selectedTax,
    calculateDiscountAmount,
  ]);

  return (
    <>
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
                name="quotationNumber"
                label="Quotation Number"
                placeholder={
                  isLoading || isRefetching
                    ? "Generating..."
                    : "Enter quotation number"
                }
              />
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshQuotationNumber}
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
              name="quotationDate"
              label="Quotation Date"
              dateFormat="MM/dd/yyyy"
            />
          </div>
          <div className="w-full flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="customerId"
              label="Customer"
              placeholder="Select customer"
              key={`customer-select-${form.watch("customerId") || ""}`}
              onAddNew={() => setCustomerDialogOpen(true)}
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

            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="rfqNumber"
              label="Request for Quotation Number"
              placeholder={"Request for quotation number"}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="taxRateId"
              label="Tax Rate"
              placeholder="Select tax rate"
              onAddNew={() => setTaxDialogOpen(true)}
              key={`tax-select-${form.watch("taxRateId") || ""}`}
            >
              {taxesLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
              {taxes &&
                taxes?.map((tax: Tax) => (
                  <SelectItem
                    key={tax.id}
                    value={tax.id}
                    className="text-14-medium text-blue-800 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                  >
                    {tax.code} - {`${tax.taxRate}%`}
                  </SelectItem>
                ))}
            </CustomFormField>
            <CustomFormField
              fieldType={FormFieldType.NUMBER}
              control={form.control}
              name="discountRate"
              label="Discount Rate(%)"
              placeholder="Enter discount rate"
            />
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
                  onAddNew={() => setProductDialogOpen(true)}
                  key={`product-select-${
                    form.watch("selectedProductId") || ""
                  }`}
                >
                  {productsLoading && (
                    <div className="py-4">
                      <Loading />
                    </div>
                  )}
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
                  <TableHead>Discount Rate</TableHead>
                  <TableHead>Discount Amount</TableHead>
                  <TableHead>Sub-Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="w-full bg-white text-blue-800">
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-4">
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
                      <p>{selectedTax?.taxRate || 0}%</p>
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={
                          (form.watch(`products.${index}.unitPrice`) *
                            form.watch(`products.${index}.quantity`) *
                            selectedTax?.taxRate) /
                            100 || 0
                        }
                      />
                    </TableCell>

                    <TableCell>
                      <p>{form.watch("discountRate") || 0}%</p>
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={
                          (form.watch(`products.${index}.quantity`) *
                            form.watch(`products.${index}.unitPrice`) *
                            form.watch("discountRate")) /
                            100 || 0
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={
                          form.watch(`products.${index}.quantity`) *
                            form.watch(`products.${index}.unitPrice`) -
                          (form.watch(`products.${index}.quantity`) *
                            form.watch(`products.${index}.unitPrice`) *
                            form.watch("discountRate")) /
                            100
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
                        colSpan={9}
                        className="text-right font-medium text-blue-800 text-[17px] py-4"
                      >
                        {`Sub-Total (${companySettings?.currencySymbol}):`}
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="font-medium text-blue-800 text-[17px] py-4"
                      >
                        <FormatNumber value={calculateTaxableAmount()} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-right font-medium text-blue-800 text-[17px] py-4"
                      >
                        {`Discount (${form.watch("discountRate") || 0}%):`}
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="font-medium text-blue-800 text-[17px] py-4"
                      >
                        <FormatNumber value={calculateDiscountAmount()} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-right font-medium text-blue-800 text-[17px] py-4"
                      >
                        {`Tax (${selectedTax?.taxRate || 0}%):`}
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
                        colSpan={9}
                        className="text-right font-semibold text-blue-800 text-[17px] py-4"
                      >
                        {`Grand Total (${companySettings?.currencySymbol}):`}
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

          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="notes"
            label="Notes"
            placeholder="Enter quotation notes"
          />

          <CustomFormField
            fieldType={FormFieldType.SKELETON}
            control={form.control}
            name="attachments"
            label="Attachment"
            renderSkeleton={(field) => (
              <FormControl>
                <FileUploader
                  files={field.value}
                  onChange={field.onChange}
                  mode={mode}
                  accept={{
                    "application/pdf": [".pdf"],
                    "application/msword": [".doc"],
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                      [".docx"],
                  }}
                  maxFiles={5}
                />
              </FormControl>
            )}
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
        open={customerDialogOpen}
        onOpenChange={closeDialog}
      />
      <TaxDialog
        mode="add"
        onSubmit={handleAddTax}
        open={taxDialogOpen}
        onOpenChange={closeDialog}
        isLoading={isAddingTax}
      />
      <ProductSheet
        mode="add"
        open={productDialogOpen}
        onOpenChange={closeDialog}
      />
    </>
  );
};

export default QuotationForm;
