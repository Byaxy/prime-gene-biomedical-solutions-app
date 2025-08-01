"use client";

import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchases";
import { useReceivingPurchases } from "@/hooks/useReceivingPurchases";
import { useStores } from "@/hooks/useStores";
import { useVendors } from "@/hooks/useVendors";
import { generateReceivingOrdereNumber } from "@/lib/actions/receivingPurchases.actions";
import {
  ReceivedInventoryStockValues,
  ReceivingPurchaseFormValidation,
  ReceivingPurchaseFormValues,
  StoreFormValues,
} from "@/lib/validation";
import {
  ProductWithRelations,
  Purchase,
  PurchaseItem,
  PurchaseWithRelations,
  ReceivedPurchaseWithRelations,
  Store,
  Vendor,
} from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import VendorDialog from "../vendors/VendorDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import DeleteIcon from "@mui/icons-material/Delete";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { Button } from "../ui/button";
import { RefreshCw } from "lucide-react";
import { Input } from "../ui/input";
import { Search } from "lucide-react";
import { X } from "lucide-react";
import { SelectItem } from "../ui/select";
import FormatNumber from "../FormatNumber";
import SubmitButton from "../SubmitButton";
import Loading from "../loading";
import { Check } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import StoreDialog from "../stores/StoreDialog";
import ReceiveInventoryStockDialog from "../receivingPurchases/ReceiveInventoryStockDialog";

interface RecievingPurchaseFormProps {
  mode: "create" | "edit";
  initialData?: ReceivedPurchaseWithRelations;
}
const RecievingPurchaseForm = ({
  mode,
  initialData,
}: RecievingPurchaseFormProps) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState<
    number | null
  >(null);
  const [prevSelectedPurchaseId, setPrevSelectedPurchaseId] = useState<
    string | null
  >(null);

  const { vendors, isLoading: vendorsLoading } = useVendors({
    getAllVendors: true,
  });
  const {
    stores,
    addStore,
    isAddingStore,
    isLoading: storesLoading,
  } = useStores({ getAllStores: true });
  const { purchases, isLoading: purchasesLoading } = usePurchases({
    getAllPurchases: true,
  });
  const {
    receivedPurchases,
    addReceivedPurchase,
    editReceivedPurchase,
    isCreatingReceivedPurchase,
    isEditingReceivedPurchase,
  } = useReceivingPurchases({
    getAllReceivedPurchases: true,
  });

  const { products: mainProducts } = useProducts({ getAllProducts: true });

  const { user } = useAuth();

  const router = useRouter();

  // Generate receiving order number
  const {
    data: generatedReceivingOrderNumber,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["receiving-order-number"],
    queryFn: async () => {
      if (mode !== "create") return null;
      const result = await generateReceivingOrdereNumber();
      return result;
    },
    enabled: mode === "create",
  });

  const defaultValues = {
    purchaseId: "",
    vendorId: "",
    storeId: "",
    receivingOrderNumber: generatedReceivingOrderNumber || "",
    receivingDate: new Date(),
    products: [],
    totalAmount: 0,
    notes: "",
  };

  const form = useForm<ReceivingPurchaseFormValues>({
    resolver: zodResolver(ReceivingPurchaseFormValidation),
    mode: "all",
    defaultValues:
      mode === "create"
        ? defaultValues
        : {
            purchaseId: initialData?.receivedPurchase.purchaseId || "",
            vendorId: initialData?.receivedPurchase.vendorId || "",
            storeId: initialData?.receivedPurchase.storeId || "",
            receivingOrderNumber:
              initialData?.receivedPurchase.receivingOrderNumber || "",
            receivingDate: initialData?.receivedPurchase.receivingDate
              ? new Date(initialData?.receivedPurchase.receivingDate)
              : new Date(),
            products: initialData?.products?.map((product) => ({
              ...product,
              inventoryStock: product.inventoryStock?.map((stock) => ({
                ...stock,
                manufactureDate: stock?.manufactureDate
                  ? new Date(stock?.manufactureDate)
                  : undefined,

                expiryDate: stock?.expiryDate
                  ? new Date(stock?.expiryDate)
                  : undefined,
              })),
            })),
            totalAmount: initialData?.receivedPurchase.totalAmount || 0,
            notes: initialData?.receivedPurchase.notes || "",
          },
  });

  const { fields, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedVendorId = form.watch("vendorId");

  const watchedFields = fields.map((_, index) => ({
    lotNumber: form.watch(`products.${index}.inventoryStock`),
    costPrice: form.watch(`products.${index}.costPrice`),
  }));

  const filteredPurchases = purchases?.reduce(
    (acc: Purchase[], purchase: PurchaseWithRelations) => {
      if (!selectedVendorId || !purchase?.purchase.vendorId) {
        return acc;
      }

      if (selectedVendorId && purchase.purchase.vendorId !== selectedVendorId) {
        return acc;
      }

      // Apply search filter (optional - if you have a search query for purchases)
      if (searchQuery?.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          purchase.purchase.purchaseOrderNumber
            ?.toLowerCase()
            .includes(query) ||
          purchase.vendor?.name?.toLowerCase().includes(query);
        if (!matchesSearch) return acc;
      }

      acc.push(purchase.purchase);
      return acc;
    },
    []
  );

  // Set receiving order number
  useEffect(() => {
    if (generatedReceivingOrderNumber && mode === "create") {
      form.setValue("receivingOrderNumber", generatedReceivingOrderNumber);
    }
  }, [generatedReceivingOrderNumber, form, mode]);

  // refresh button handler
  const handleRefreshReceivingOrderNumber = async () => {
    if (mode === "create") {
      try {
        await refetch();
        if (generatedReceivingOrderNumber) {
          form.setValue("receivingOrderNumber", generatedReceivingOrderNumber);
        }
      } catch (error) {
        console.error("Error refreshing receiving order number:", error);
        toast.error("Failed to refresh receiving order number");
      }
    }
  };

  // handle close dialog
  const closeDialog = () => {
    setVendorDialogOpen(false);
    setStoreDialogOpen(false);

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

  const handleDeleteEntry = (index: number) => {
    remove(index);
  };

  const validateReceivingOrderNumber = (receivingOrderNumber: string) => {
    if (!receivingOrderNumber) return false;
    if (!receivedPurchases) return true;
    if (receivedPurchases.length === 0) return true;

    const existingPurchaseOrder = receivedPurchases?.find(
      (purchase: ReceivedPurchaseWithRelations) =>
        purchase?.receivedPurchase.receivingOrderNumber === receivingOrderNumber
    );
    if (mode === "create" && existingPurchaseOrder) return false;

    if (
      mode === "edit" &&
      initialData?.receivedPurchase.receivingOrderNumber !==
        receivingOrderNumber &&
      existingPurchaseOrder
    )
      return false;
    return true;
  };

  const handleAddStore = async (data: StoreFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addStore(data, {
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

  const handleVendorChange = (value: string) => {
    form.setValue("vendorId", value);
    form.setValue("purchaseId", "");
    form.setValue("products", []);
    setPrevSelectedPurchaseId(null);
  };

  const handlePurchaseSelection = (selectedPurchaseId: string) => {
    form.setValue("purchaseId", selectedPurchaseId);
    setPrevSelectedPurchaseId(selectedPurchaseId);
    setSearchQuery("");

    // Find and click the hidden SelectItem with this value
    const selectItem = document.querySelector(
      `[data-value="${selectedPurchaseId}"]`
    ) as HTMLElement;
    if (selectItem) {
      selectItem.click();
    }

    const selectedPurchase = purchases?.find(
      (purchase: PurchaseWithRelations) =>
        purchase.purchase.id === selectedPurchaseId
    );
    if (selectedPurchase) {
      const products = selectedPurchase.products.map(
        (product: PurchaseItem) => {
          const mainPdt = mainProducts?.find(
            (pdt: ProductWithRelations) => pdt.product.id === product.productId
          );

          return {
            purchaseItemId: product.id,
            productId: product.productId,
            productName: product.productName,
            productID: product.productID,
            pendingQuantity: product.quantity - product.quantityReceived,
            costPrice: product.costPrice || mainPdt?.product.costPrice,
            sellingPrice: mainPdt?.product.sellingPrice || 0,
            inventoryStock: [],
          };
        }
      );
      form.setValue("products", products);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = form.getValues();

      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      if (!validateReceivingOrderNumber(values.receivingOrderNumber)) {
        toast.error(
          "A Order with the same Receiving Order number already exists."
        );
        return;
      }

      if (mode === "create") {
        await addReceivedPurchase(
          { data: values, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Purchase order received successfully!");
              form.reset();
              router.push("/purchases/received-inventory");
            },
            onError: (error) => {
              console.error("Receive Purchase order error:", error);
              toast.error("Failed to receive Purchase order");
            },
          }
        );
      }
      if (mode === "edit" && initialData) {
        if (initialData?.receivedPurchase.id) {
          await editReceivedPurchase(
            {
              id: initialData?.receivedPurchase.id,
              data: values,
              userId: user.id,
            },
            {
              onSuccess: () => {
                toast.success("Received Purchase order updated successfully!");
                router.push("/purchases/receive-inventory");
              },
              onError: (error) => {
                console.error("Update received purchase order error:", error);
                toast.error("Failed to update purchase order");
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

  const calculateEntryTotalCost = useCallback(
    (index: number) => {
      const invStock = form.watch(`products.${index}.inventoryStock`) || [];
      const costPrice = form.watch(`products.${index}.costPrice`) || 0;
      const quantity = invStock.reduce(
        (acc: number, stock) => acc + stock.quantity,
        0
      );
      return quantity * costPrice;
    },
    [form]
  );

  const calculateTotalAmount = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateEntryTotalCost(index);
    });
    return total;
  }, [calculateEntryTotalCost, fields]);

  useEffect(() => {
    if (fields.length > 0) {
      fields.forEach((field, index) => {
        const entryTotalCost = calculateEntryTotalCost(index);

        form.setValue(`products.${index}.totalCost`, entryTotalCost);
      });
      form.setValue("totalAmount", calculateTotalAmount());
    }
  }, [
    watchedFields,
    fields,
    form,
    calculateTotalAmount,
    calculateEntryTotalCost,
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
                name="receivingOrderNumber"
                label="Receiving Order Number"
                placeholder={
                  isLoading || isRefetching
                    ? "Generating..."
                    : "Enter receiving order number"
                }
              />
              <Button
                type="button"
                size={"icon"}
                onClick={handleRefreshReceivingOrderNumber}
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
              name="receivingDate"
              label="Receiving Date"
              dateFormat="MM/dd/yyyy"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="storeId"
              label="Store"
              placeholder="Select store"
              onAddNew={() => setStoreDialogOpen(true)}
              key={`store-select-${form.watch("storeId") || ""}`}
            >
              {storesLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
              {stores?.map((store: Store) => (
                <SelectItem
                  key={store.id}
                  value={store.id}
                  className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                >
                  {store.name}
                </SelectItem>
              ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="vendorId"
              label="Vendor"
              placeholder="Select vendor"
              onAddNew={() => setVendorDialogOpen(true)}
              onValueChange={(value) => handleVendorChange(value)}
              key={`vendor-select-${form.watch("vendorId") || ""}`}
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
                  name="purchaseId"
                  label="Select Purchase Order"
                  placeholder={
                    purchasesLoading
                      ? "Loading..."
                      : selectedVendorId
                      ? "Select purchase order"
                      : "Select vendor first"
                  }
                  key={`purchase-select-${form.watch("purchaseId") || ""}`}
                  disabled={purchasesLoading || !selectedVendorId}
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
                        disabled={purchasesLoading || !selectedVendorId}
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
                  {purchasesLoading ? (
                    <div className="py-4">
                      <Loading />
                    </div>
                  ) : filteredPurchases && filteredPurchases.length > 0 ? (
                    <>
                      <Table className="shad-table border border-light-200 rounded-lg">
                        <TableHeader>
                          <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                            <TableHead>Date</TableHead>
                            <TableHead>Purchase Order Number</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="w-full bg-white">
                          {filteredPurchases.map((purchase: Purchase) => (
                            <TableRow
                              key={purchase.id}
                              className="cursor-pointer hover:bg-blue-50"
                              onClick={() =>
                                handlePurchaseSelection(purchase.id)
                              }
                            >
                              <TableCell>
                                {formatDateTime(purchase.purchaseDate).dateTime}
                              </TableCell>
                              <TableCell>
                                {purchase.purchaseOrderNumber}
                              </TableCell>
                              <TableCell className="w-10">
                                {prevSelectedPurchaseId === purchase.id && (
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
                        {filteredPurchases.map((purchase: Purchase) => (
                          <SelectItem
                            key={purchase.id}
                            value={purchase.id}
                            data-value={purchase.id}
                          >
                            {formatDateTime(purchase.purchaseDate).dateTime} -{" "}
                            {purchase.purchaseOrderNumber}
                          </SelectItem>
                        ))}
                      </div>
                    </>
                  ) : (
                    <SelectItem value="null" disabled>
                      <div>No purchases found</div>
                    </SelectItem>
                  )}
                </CustomFormField>
              </div>
            </div>

            <Table className="shad-table">
              <TableHeader>
                <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                  <TableHead>#</TableHead>
                  <TableHead>PID</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead>Qnty Pending</TableHead>
                  <TableHead className="!max-w-60">Lot Numbers</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Sub-Total Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="w-full bg-white text-blue-800">
                {fields.length === 0 && (
                  <TableRow key={"no-products"}>
                    <TableCell colSpan={9} className="text-center py-4">
                      No products added
                    </TableCell>
                  </TableRow>
                )}
                {fields.map((entry, index) => (
                  <>
                    <TableRow
                      key={`${entry.productId}-${index}`}
                      className={`w-full ${
                        index % 2 === 1 ? "bg-blue-50" : ""
                      }`}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{entry.productID}</TableCell>
                      <TableCell>{entry.productName}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                          {entry.pendingQuantity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedProductIndex(index)}
                          className={cn(
                            "text-white border-0",
                            entry.pendingQuantity > 0 &&
                              form.watch(`products.${index}.costPrice`) > 0 &&
                              form.watch(`products.${index}.inventoryStock`)
                                ?.length > 0 &&
                              form
                                .watch(`products.${index}.inventoryStock`)
                                ?.some(
                                  (stock) =>
                                    stock.quantity > 0 &&
                                    stock.lotNumber?.trim()
                                )
                              ? "bg-green-500"
                              : "bg-red-600"
                          )}
                          type="button"
                          title="Manage Lot Numbers / Inventory stock"
                          disabled={
                            form.watch(`products.${index}.costPrice`) <= 0 ||
                            entry.pendingQuantity <= 0
                          }
                        >
                          {form.watch(`products.${index}.costPrice`) <= 0
                            ? "Add Cost Price first"
                            : "Manage Lots"}
                        </Button>
                        <ReceiveInventoryStockDialog
                          open={selectedProductIndex === index}
                          onOpenChange={(open) =>
                            setSelectedProductIndex(open ? index : null)
                          }
                          onSave={(data: ReceivedInventoryStockValues) => {
                            form.setValue(
                              `products.${index}.inventoryStock`,
                              data.inventoryStock
                            );
                            form.setValue(
                              `products.${index}.totalCost`,
                              data.totalCost
                            );
                            form.trigger(`products.${index}.inventoryStock`);
                          }}
                          costPrice={form.watch(`products.${index}.costPrice`)}
                          productID={entry.productID}
                          pendingQuantity={entry.pendingQuantity}
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
                        <CustomFormField
                          fieldType={FormFieldType.AMOUNT}
                          control={form.control}
                          name={`products.${index}.sellingPrice`}
                          label=""
                          placeholder="Selling price"
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                          <FormatNumber
                            value={calculateEntryTotalCost(index)}
                          />
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
                    {Array.isArray(form.formState.errors?.products) &&
                      form.formState.errors.products[index]?.inventoryStock && (
                        <TableRow key={"products-errors"}>
                          <TableCell colSpan={9} className="shad-error text-xs">
                            {
                              form.formState.errors.products[index]
                                ?.inventoryStock.message
                            }
                          </TableCell>
                        </TableRow>
                      )}
                  </>
                ))}
                {/* Total amount row */}
                {fields.length > 0 && (
                  <>
                    <TableRow key={"summary"}>
                      <TableCell
                        colSpan={7}
                        className="text-right font-semibold text-blue-800 text-[17px] py-4"
                      >
                        {`Total Cost Price:`}
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
              isLoading={
                isCreatingReceivedPurchase || isEditingReceivedPurchase
              }
              className="shad-primary-btn"
            >
              {mode === "create" ? "Create Purchase" : "Update Purchase"}
            </SubmitButton>
          </div>
        </form>
      </Form>

      <VendorDialog
        mode="add"
        open={vendorDialogOpen}
        onOpenChange={closeDialog}
      />
      <StoreDialog
        mode="add"
        onSubmit={handleAddStore}
        open={storeDialogOpen}
        onOpenChange={closeDialog}
        isLoading={isAddingStore}
      />
    </>
  );
};

export default RecievingPurchaseForm;
