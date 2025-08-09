"use client";

import { useProducts } from "@/hooks/useProducts";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useVendors } from "@/hooks/useVendors";
import { generatePurchaseOrderNumber } from "@/lib/actions/purchaseOrder.actions";
import {
  PurchaseOrderFormValidation,
  PurchaseOrderFormValues,
} from "@/lib/validation";
import {
  InventoryStockWithRelations,
  Product,
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
import Loading from "@/components/loading";
import FormatNumber from "@/components/FormatNumber";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import VendorDialog from "../vendors/VendorDialog";
import { useInventoryStock } from "@/hooks/useInventoryStock";
import { Check } from "lucide-react";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { RefreshCw } from "lucide-react";

interface Props {
  mode: "create" | "edit";
  initialData?: PurchaseOrderWithRelations;
}

const PurchaseOrderForm = ({ mode, initialData }: Props) => {
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedProductId, setPrevSelectedProductId] = useState<
    string | null
  >(null);
  const { products, isLoading: productsLoading } = useProducts({
    getAllProducts: true,
  });
  const { vendors, isLoading: vendorsLoading } = useVendors({
    getAllVendors: true,
  });

  const {
    purchaseOrders,
    addPurchaseOrder,
    editPurchaseOrder,
    isCreatingPurchaseOrder,
    isEditingPurchaseOrder,
  } = usePurchaseOrders({ getAllPurchaseOrders: true });

  const { inventoryStock } = useInventoryStock({
    getAllInventoryStocks: true,
  });

  const router = useRouter();

  // Generate purchase order number
  const {
    data: generatedPurchaseOrderNumber,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["purchase-order-number"],
    queryFn: async () => {
      if (mode !== "create") return null;
      const result = await generatePurchaseOrderNumber();
      return result;
    },
    enabled: mode === "create",
  });

  const defaultValues = {
    purchaseOrderNumber: generatedPurchaseOrderNumber || "",
    purchaseOrderDate: new Date(),
    products: [],
    vendorId: "",
    status: PurchaseStatus.Pending as PurchaseStatus,
    notes: "",
    totalAmount: 0,
    selectedProductId: "",
  };

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(PurchaseOrderFormValidation),
    mode: "all",
    defaultValues:
      mode === "create"
        ? defaultValues
        : {
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
          },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedProductId = form.watch("selectedProductId");
  const watchedFields = fields.map((_, index) => ({
    quantity: form.watch(`products.${index}.quantity`),
  }));

  const filteredProducts = products?.reduce(
    (acc: Product[], product: ProductWithRelations) => {
      if (!product?.product?.id || !product?.product?.productID) {
        return acc;
      }

      const { product: pdt } = product;

      const productQnty =
        inventoryStock?.reduce(
          (total: number, inv: InventoryStockWithRelations) => {
            if (
              !inv?.product?.id ||
              !inv?.inventory?.quantity ||
              !inv?.store?.id
            ) {
              return total;
            }

            if (
              inv.product.id === pdt.id &&
              inv.product.productID === pdt.productID &&
              inv.inventory.quantity > 0
            ) {
              return total + inv.inventory.quantity;
            }

            return total;
          },
          0
        ) || 0;

      const updatedProduct = { ...pdt, quantity: productQnty };

      // Apply search filter
      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          updatedProduct.productID?.toLowerCase().includes(query) ||
          updatedProduct.name?.toLowerCase().includes(query);

        if (!matchesSearch) return acc;
      }

      acc.push(updatedProduct);
      return acc;
    },
    []
  );

  // Initialize edit mode data
  useEffect(() => {
    if (initialData && mode === "edit") {
      setTimeout(() => {
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
      }, 100);
    }
  }, [mode, initialData, form]);

  // Set purchaseOrder number
  useEffect(() => {
    if (generatedPurchaseOrderNumber && mode === "create") {
      form.setValue("purchaseOrderNumber", generatedPurchaseOrderNumber);
    }
  }, [generatedPurchaseOrderNumber, form, mode]);

  // Update the refresh button handler
  const handleRefreshPurchaseOrderNumber = async () => {
    if (mode === "create") {
      try {
        await refetch();
        if (generatedPurchaseOrderNumber) {
          form.setValue("purchaseOrderNumber", generatedPurchaseOrderNumber);
        }
      } catch (error) {
        console.error("Error refreshing purchase order number:", error);
        toast.error("Failed to refresh purchase order number");
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

      if (mode === "create") {
        await addPurchaseOrder(values, {
          onSuccess: () => {
            toast.success("Purchase order created successfully!");
            form.reset();
            router.push("/purchases/purchase-orders");
          },
          onError: (error) => {
            console.error("Create Purchase order error:", error);
            toast.error("Failed to create Purchase order");
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
                toast.success("Purchase order updated successfully!");
                router.push("/purchases/purchase-orders");
              },
              onError: (error) => {
                console.error("Update purchase order error:", error);
                toast.error("Failed to update purchase order");
              },
            }
          );
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    } finally {
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
            >
              {vendorsLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
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
                  isLoading || isRefetching
                    ? "Generating..."
                    : "Enter purchase order number"
                }
              />
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshPurchaseOrderNumber}
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="purchaseOrderDate"
              label="Purchase Order Date"
              dateFormat="MM/dd/yyyy"
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
                  placeholder={
                    productsLoading ? "Loading..." : "Select inventory"
                  }
                  key={`inventory-select-${selectedProductId || ""}`}
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
                        disabled={productsLoading}
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
                  {productsLoading ? (
                    <div className="py-4">
                      <Loading />
                    </div>
                  ) : filteredProducts && filteredProducts.length > 0 ? (
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
                          {filteredProducts.map((product: Product) => (
                            <TableRow
                              key={product.id}
                              className="cursor-pointer hover:bg-blue-50"
                              onClick={() => {
                                form.setValue("selectedProductId", product.id);
                                setPrevSelectedProductId(product.id);
                                setSearchQuery("");
                                // Find and click the hidden SelectItem with this value
                                const selectItem = document.querySelector(
                                  `[data-value="${product.id}"]`
                                ) as HTMLElement;
                                if (selectItem) {
                                  selectItem.click();
                                }
                              }}
                            >
                              <TableCell>{product.productID}</TableCell>
                              <TableCell>{product.name}</TableCell>
                              <TableCell>{product.quantity}</TableCell>
                              <TableCell className="w-10">
                                {prevSelectedProductId === product.id && (
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
                        {filteredProducts.map((product: Product) => (
                          <SelectItem
                            key={product.id}
                            value={product.id}
                            data-value={product.id}
                          >
                            {product.productID} -{product.name}
                            {}
                          </SelectItem>
                        ))}
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
                      />
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.AMOUNT}
                        control={form.control}
                        name={`products.${index}.costPrice`}
                        label=""
                        placeholder="Cost price"
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
              isLoading={isCreatingPurchaseOrder || isEditingPurchaseOrder}
              className="shad-primary-btn"
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
