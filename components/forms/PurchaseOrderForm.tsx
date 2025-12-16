"use client";

import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { generatePurchaseOrderNumber } from "@/lib/actions/purchaseOrder.actions";
import {
  PurchaseOrderFormValidation,
  PurchaseOrderFormValues,
} from "@/lib/validation";
import {
  ProductWithRelations,
  PurchaseOrderWithRelations,
  PurchaseStatus,
  Vendor,
} from "@/types";
import SubmitButton from "../SubmitButton";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Form } from "../ui/form";
import { Button } from "../ui/button";
import { SelectItem } from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import DeleteIcon from "@mui/icons-material/Delete";
import { X } from "lucide-react";
import FormatNumber from "@/components/FormatNumber";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import VendorDialog from "../vendors/VendorDialog";
import { Check } from "lucide-react";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  mode: "create" | "edit";
  initialData?: PurchaseOrderWithRelations;
  products: ProductWithRelations[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrderWithRelations[];
  generatedPurchaseOrderNumber?: string;
}

const PurchaseOrderForm = ({
  mode,
  initialData,
  products,
  vendors,
  purchaseOrders,
  generatedPurchaseOrderNumber: initialGeneratedPurchaseOrderNumber,
}: Props) => {
  const [isRefetchingNumber, setIsRefetchingNumber] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedProductId, setPrevSelectedProductId] = useState<
    string | null
  >(null);

  const {
    addPurchaseOrder,
    editPurchaseOrder,
    isCreatingPurchaseOrder,
    isEditingPurchaseOrder,
  } = usePurchaseOrders({ getAllPurchaseOrders: true });

  const router = useRouter();
  const initialMount = useRef(true);

  const defaultValues = useMemo(
    () => ({
      purchaseOrderNumber: initialGeneratedPurchaseOrderNumber || "",
      purchaseOrderDate: new Date(),
      products: [],
      vendorId: "",
      status: PurchaseStatus.Pending as PurchaseStatus,
      notes: "",
      totalAmount: 0,
      selectedProductId: "",
    }),
    [initialGeneratedPurchaseOrderNumber]
  );

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(PurchaseOrderFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedProductId = form.watch("selectedProductId");
  const watchedFields = fields.map((_, index) => ({
    quantity: form.watch(`products.${index}.quantity`),
  }));

  const filteredProducts = useMemo(() => {
    return products?.reduce(
      (acc: ProductWithRelations[], product: ProductWithRelations) => {
        if (!product?.product?.id || !product?.product?.productID) {
          return acc;
        }

        // Apply search filter
        if (searchQuery?.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesSearch =
            product.product.productID?.toLowerCase().includes(query) ||
            product.product.name?.toLowerCase().includes(query);

          if (!matchesSearch) return acc;
        }

        acc.push(product);
        return acc;
      },
      []
    );
  }, [products, searchQuery]);

  useEffect(() => {
    if (mode === "create" && typeof window !== "undefined") {
      const savedData = window.localStorage.getItem("purchaseOrderForm");
      if (savedData) {
        try {
          const parsedData: PurchaseOrderFormValues = JSON.parse(savedData);

          parsedData.purchaseOrderDate = parsedData.purchaseOrderDate
            ? new Date(parsedData.purchaseOrderDate)
            : new Date();

          const loadedProducts = parsedData.products.map((product) => ({
            productId: product?.productId,
            quantity: product?.quantity,
            costPrice: product?.costPrice,
            totalPrice: product?.totalPrice,
            productID: product?.productID,
            productName: product?.productName,
          }));

          form.reset(
            {
              ...defaultValues,
              ...parsedData,
              products: loadedProducts,
            },
            { keepDefaultValues: false }
          );
        } catch (error) {
          console.error(
            "Failed to parse saved form data from localStorage:",
            error
          );
          window.localStorage.removeItem("purchaseOrderForm");
        }
      } else {
        form.reset(defaultValues);
      }
    }
  }, [mode, defaultValues, form]);

  // Explicitly sync field array after loading from localStorage
  useEffect(() => {
    if (mode === "create" && typeof window !== "undefined") {
      const savedData = window.localStorage.getItem("purchaseOrderForm");
      if (savedData) {
        try {
          const parsedData: PurchaseOrderFormValues = JSON.parse(savedData);

          if (
            parsedData.products &&
            parsedData.products.length > 0 &&
            fields.length === 0
          ) {
            const loadedProducts = parsedData.products.map((product) => ({
              productId: product?.productId,
              quantity: product?.quantity,
              costPrice: product?.costPrice,
              totalPrice: product?.totalPrice,
              productID: product?.productID,
              productName: product?.productName,
            }));

            form.setValue("products", loadedProducts);
          }
        } catch (error) {
          console.error("Failed to sync products from localStorage:", error);
        }
      }
    }
  }, [mode, fields.length, form]);

  // Save data to localStorage whenever form values change (debounced)
  useEffect(() => {
    if (mode !== "create" || typeof window === "undefined") {
      return;
    }

    const subscription = form.watch((value) => {
      const timeoutId = setTimeout(() => {
        const dataToSave = JSON.stringify({
          ...value,
          purchaseOrderDate:
            value.purchaseOrderDate instanceof Date
              ? value.purchaseOrderDate.toISOString()
              : value.purchaseOrderDate,
          purchaseOrderNumber: "",
          products: value.products?.map((product) => ({
            productId: product?.productId,
            quantity: product?.quantity,
            costPrice: product?.costPrice,
            totalPrice: product?.totalPrice,
            productID: product?.productID,
            productName: product?.productName,
          })),
          selectedProductId: "",
        });
        window.localStorage.setItem("purchaseOrderForm", dataToSave);
      }, 500);

      return () => clearTimeout(timeoutId);
    });

    return () => subscription.unsubscribe();
  }, [form, mode]);

  // Initialize edit mode data
  useEffect(() => {
    if (initialMount.current) {
      if (initialData && mode === "edit") {
        form.reset({
          purchaseOrderNumber:
            initialData?.purchaseOrder.purchaseOrderNumber || "",
          purchaseOrderDate: initialData?.purchaseOrder.purchaseOrderDate
            ? new Date(initialData?.purchaseOrder.purchaseOrderDate)
            : new Date(),
          products: initialData?.products || [],
          vendorId: initialData?.purchaseOrder.vendorId || "",
          status: initialData?.purchaseOrder.status || PurchaseStatus.Pending,
          notes: initialData?.purchaseOrder.notes || "",
          totalAmount: initialData?.purchaseOrder.totalAmount || 0,
          selectedProductId: "",
        });
      } else if (mode === "create" && initialGeneratedPurchaseOrderNumber) {
        form.setValue(
          "purchaseOrderNumber",
          initialGeneratedPurchaseOrderNumber
        );
      }
      initialMount.current = false;
    }
  }, [mode, initialData, form, initialGeneratedPurchaseOrderNumber]);

  useEffect(() => {
    if (
      mode === "create" &&
      initialGeneratedPurchaseOrderNumber &&
      form.getValues("purchaseOrderNumber") === ""
    ) {
      form.setValue("purchaseOrderNumber", initialGeneratedPurchaseOrderNumber);
    }
  }, [initialGeneratedPurchaseOrderNumber, form, mode]);

  // Update the refresh button handler
  const handleRefreshPurchaseOrderNumber = async () => {
    if (mode === "create") {
      try {
        setIsRefetchingNumber(true);
        const newPurchaseOrderNumber = await generatePurchaseOrderNumber();
        form.setValue("purchaseOrderNumber", newPurchaseOrderNumber);
      } catch (error) {
        console.error("Error refreshing purchase order number:", error);
        toast.error("Failed to refresh purchase order number");
      } finally {
        setIsRefetchingNumber(false);
      }
    }
  };

  // handle close dialog
  const closeDialog = () => {
    setVendorDialogOpen(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };
  // cancel button handler
  const handleCancel = () => {
    if (mode === "create") {
      form.reset(defaultValues);
      form.setValue(
        "purchaseOrderNumber",
        initialGeneratedPurchaseOrderNumber || ""
      );
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("purchaseOrderForm");
      }
    } else {
      if (initialData) {
        form.reset({
          purchaseOrderNumber:
            initialData?.purchaseOrder.purchaseOrderNumber || "",
          purchaseOrderDate: initialData?.purchaseOrder.purchaseOrderDate
            ? new Date(initialData?.purchaseOrder.purchaseOrderDate)
            : new Date(),
          products: initialData?.products || [],
          vendorId: initialData?.purchaseOrder.vendorId || "",
          status: initialData?.purchaseOrder.status || PurchaseStatus.Pending,
          notes: initialData?.purchaseOrder.notes || "",
          totalAmount: initialData?.purchaseOrder.totalAmount || 0,
          selectedProductId: "",
        });
      } else {
        form.reset(defaultValues);
      }
    }
  };

  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    const selectedProduct = products?.find(
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

    prepend({
      productId: selectedProduct.product.id,
      quantity: 0,
      costPrice: selectedProduct.product.costPrice,
      totalPrice: 0,
      productID: selectedProduct.product.productID,
      productName: selectedProduct.product.name,
    });
    form.setValue("selectedProductId", "");
  };

  const handleDeleteEntry = (index: number) => {
    remove(index);
  };

  const validatePurchaseOrderNumber = (purchaseOrderNumber: string) => {
    const existingPurchaseOrder = purchaseOrders?.find(
      (purchase: PurchaseOrderWithRelations) =>
        purchase.purchaseOrder.purchaseOrderNumber === purchaseOrderNumber
    );
    if (mode === "create" && existingPurchaseOrder) return false;

    if (
      mode === "edit" &&
      initialData?.purchaseOrder.purchaseOrderNumber !== purchaseOrderNumber &&
      existingPurchaseOrder
    )
      return false;
    return true;
  };

  const calculateEntryTotalPrice = useCallback(
    (index: number) => {
      const quantity = form.watch(`products.${index}.quantity`) || 0;
      const costPrice = form.watch(`products.${index}.costPrice`) || 0;
      return quantity * costPrice;
    },
    [form]
  );

  const calculateTotalAmount = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateEntryTotalPrice(index);
    });
    return total;
  }, [fields, calculateEntryTotalPrice]);

  const handleSubmit = async () => {
    try {
      const values = form.getValues();

      if (!validatePurchaseOrderNumber(values.purchaseOrderNumber)) {
        toast.error(
          "A Purchase Order with the same Purchase Order number already exists."
        );
        return;
      }

      const loadingToastId = toast.loading(
        mode === "create"
          ? "Creating purchase order..."
          : "Updating purchase order..."
      );

      try {
        if (mode === "create") {
          await addPurchaseOrder(values, {
            onSuccess: () => {
              toast.success("Purchase order created successfully!", {
                id: loadingToastId,
              });
              router.push("/purchases/purchase-orders");
              router.refresh();
              form.reset(defaultValues);
              if (typeof window !== "undefined") {
                window.localStorage.removeItem("purchaseOrderForm");
              }
            },
          });
        }

        if (mode === "edit" && initialData) {
          if (initialData?.purchaseOrder.id) {
            await editPurchaseOrder(
              {
                id: initialData?.purchaseOrder.id,
                data: values,
              },
              {
                onSuccess: () => {
                  toast.success("Purchase order updated successfully!", {
                    id: loadingToastId,
                  });
                  router.push("/purchases/purchase-orders");
                  router.refresh();
                  form.reset(defaultValues);
                },
              }
            );
          }
        }
      } catch (error) {
        console.error("Purchase order operation error:", error);
        toast.error(
          `Failed to ${mode === "create" ? "create" : "update"} purchase order`,
          { id: loadingToastId }
        );
      } finally {
        toast.dismiss(loadingToastId);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
  };

  useEffect(() => {
    if (fields.length > 0) {
      fields.forEach((field, index) => {
        const entryTotalPrice = calculateEntryTotalPrice(index);

        form.setValue(`products.${index}.totalPrice`, entryTotalPrice);
      });

      form.setValue("totalAmount", calculateTotalAmount());
    }
  }, [
    watchedFields,
    fields,
    form,
    calculateTotalAmount,
    calculateEntryTotalPrice,
  ]);

  const isAnyMutationLoading =
    isCreatingPurchaseOrder || isEditingPurchaseOrder;

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-5 text-dark-500"
        >
          <div className="w-full flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="vendorId"
              label="Vendor"
              placeholder="Select vendor"
              key={`vendor-select-${form.watch("vendorId") || ""}`}
              onAddNew={() => setVendorDialogOpen(true)}
              disabled={isAnyMutationLoading}
            >
              {vendors?.map((vendor: Vendor) => (
                <SelectItem
                  key={vendor.id}
                  value={vendor.id}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                >
                  {vendor.name}
                </SelectItem>
              ))}
            </CustomFormField>

            <div className="flex flex-1 flex-row gap-2 items-center">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="purchaseOrderNumber"
                label="Purchase Order Number"
                placeholder={
                  isRefetchingNumber
                    ? "Generating..."
                    : "Enter purchase order number"
                }
                disabled={isAnyMutationLoading || isRefetchingNumber}
              />
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshPurchaseOrderNumber}
                className="self-end shad-primary-btn px-5"
                disabled={isRefetchingNumber || isAnyMutationLoading}
              >
                <RefreshCw
                  className={`h-5 w-5 ${
                    isRefetchingNumber ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="purchaseOrderDate"
              label="Purchase Order Date"
              dateFormat="MM/dd/yyyy"
              disabled={isAnyMutationLoading}
            />
          </div>

          <div
            className={`space-y-5 ${
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
                  label="Select Inventory"
                  placeholder={"Select inventory"}
                  key={`inventory-select-${selectedProductId || ""}`}
                  disabled={isAnyMutationLoading}
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
                        disabled={isAnyMutationLoading}
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
                  {filteredProducts && filteredProducts.length > 0 ? (
                    <>
                      <Table className="shad-table border border-light-200 rounded-lg">
                        <TableHeader>
                          <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                            <TableHead>Product ID</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Qnty</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="w-full bg-white">
                          {filteredProducts.map(
                            (product: ProductWithRelations) => (
                              <TableRow
                                key={product.product.id}
                                className="cursor-pointer hover:bg-blue-50"
                                onClick={() => {
                                  if (isAnyMutationLoading) return;
                                  form.setValue(
                                    "selectedProductId",
                                    product.product.id
                                  );
                                  setPrevSelectedProductId(product.product.id);
                                  setSearchQuery("");
                                  // Find and click the hidden SelectItem with this value
                                  const selectItem = document.querySelector(
                                    `[data-value="${product.product.id}"]`
                                  ) as HTMLElement;
                                  if (selectItem) {
                                    selectItem.click();
                                  }
                                }}
                              >
                                <TableCell>
                                  {product.product.productID}
                                </TableCell>
                                <TableCell>{product.product.name}</TableCell>
                                <TableCell>
                                  {product.totalInventoryStockQuantity}
                                </TableCell>
                                <TableCell className="w-10">
                                  {prevSelectedProductId ===
                                    product.product.id && (
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
                        {filteredProducts.map(
                          (product: ProductWithRelations) => (
                            <SelectItem
                              key={product.product.id}
                              value={product.product.id}
                              data-value={product.product.id}
                            >
                              {product.product.productID} -
                              {product.product.name}
                              {}
                            </SelectItem>
                          )
                        )}
                      </div>
                    </>
                  ) : (
                    <SelectItem value="null" disabled>
                      <div>No inventory found</div>
                    </SelectItem>
                  )}
                </CustomFormField>
              </div>
              <Button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProductId || isAnyMutationLoading}
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
                  <TableHead>Cost Price</TableHead>
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
                        disabled={isAnyMutationLoading}
                      />
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.AMOUNT}
                        control={form.control}
                        name={`products.${index}.costPrice`}
                        label=""
                        placeholder="Cost price"
                        disabled={isAnyMutationLoading}
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                        <FormatNumber value={calculateEntryTotalPrice(index)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-row items-center">
                        <span
                          onClick={() => {
                            if (!isAnyMutationLoading) handleDeleteEntry(index);
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

          <div className="w-full flex flex-col sm:w-1/2 gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="status"
              label="Purchase Status"
              placeholder="Select status"
              key={`status-select-${form.watch("status") || ""}`}
              disabled={isAnyMutationLoading}
            >
              {Object.values(PurchaseStatus).map((status) => (
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
            placeholder="Enter purchase notes"
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
              isLoading={isCreatingPurchaseOrder || isEditingPurchaseOrder}
              className="shad-primary-btn"
              disabled={isAnyMutationLoading}
            >
              {mode === "create"
                ? "Create Purchase Order"
                : "Update Purchase Order"}
            </SubmitButton>
          </div>
        </form>
      </Form>

      <VendorDialog
        mode="add"
        open={vendorDialogOpen}
        onOpenChange={closeDialog}
      />
    </>
  );
};

export default PurchaseOrderForm;
