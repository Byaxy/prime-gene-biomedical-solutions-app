import { useProducts } from "@/hooks/useProducts";
import { getProductById } from "@/lib/actions/product.actions";
import {
  StockAdjustmentFormValidation,
  StockAdjustmentFormValues,
  StoreFormValues,
} from "@/lib/validation";
import {
  InventoryStockWithRelations,
  Product,
  ProductWithRelations,
  Store,
} from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import FormatNumber from "../FormatNumber";
import { formatDateTime } from "@/lib/utils";
import SubmitButton from "../SubmitButton";
import { useStores } from "@/hooks/useStores";
import { useInventoryStock } from "@/hooks/useInventoryStock";
import { useAuth } from "@/hooks/useAuth";
import Loading from "../../app/(dashboard)/loading";
import StoreDialog from "../stores/StoreDialog";
import { Check } from "lucide-react";
import { Input } from "../ui/input";
import { Search } from "lucide-react";

interface FormProduct {
  productId: string;
  quantity: number;
  lotNumber: string;
  costPrice: number;
  sellingPrice: number;
  manufactureDate: Date | undefined;
  expiryDate: Date | undefined;
  productName?: string;
  productUnit?: string;
}

export type ExtendedStockAdjustmentFormValues = Omit<
  StockAdjustmentFormValues,
  "products"
> & {
  products: FormProduct[];
};

const NewStockForm = () => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [prevSelectedProductId, setPrevSelectedProductId] = useState<
    string | null
  >(null);
  const { products, isLoading: productsLoading } = useProducts({
    getAllProducts: true,
  });
  const { inventoryStock } = useInventoryStock({
    getAllInventoryStocks: true,
  });
  const {
    stores,
    addStore,
    isLoading: storesLoading,
    isAddingStore,
  } = useStores({
    getAllStores: true,
  });
  const { addInventoryStock, isAddingInventoryStock } = useInventoryStock();
  const { user } = useAuth();

  const router = useRouter();

  const defaultValues = {
    storeId: "",
    receivedDate: new Date(),
    products: [] as FormProduct[],
    notes: "",

    selectedProduct: "",
    tempQuantity: 0,
    tempLotNumber: "",
    tempCostPrice: 0,
    tempSellingPrice: 0,
    tempManufactureDate: undefined,
    tempExpiryDate: undefined,
  };

  const form = useForm<ExtendedStockAdjustmentFormValues>({
    resolver: zodResolver(StockAdjustmentFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const selectedProductId = form.watch("selectedProduct");

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

  // Handle product selection
  useEffect(() => {
    const updateSelectedProduct = async () => {
      if (!selectedProductId) return;

      try {
        const product: ProductWithRelations = await getProductById(
          selectedProductId
        );
        setSelectedProductName(product.product.name);
        form.setValue("tempCostPrice", product.product.costPrice);
        form.setValue("tempSellingPrice", product.product.sellingPrice);
      } catch (error) {
        console.error("Error fetching product:", error);
        setSelectedProductName("");
        form.setValue("tempCostPrice", 0);
        form.setValue("tempSellingPrice", 0);
      }
    };

    updateSelectedProduct();
  }, [selectedProductId, editingIndex, form]);

  // Handle product addition
  const handleAddProduct = async () => {
    const currentProductId = form.getValues("selectedProduct");
    if (!currentProductId) {
      toast.error("Please select a product");
      return;
    }

    try {
      const selectedProduct = (await getProductById(
        currentProductId
      )) as ProductWithRelations;
      if (!selectedProduct) {
        throw new Error("Product not found");
      }

      const quantity = form.getValues("tempQuantity") || 0;
      const lotNumber = form.getValues("tempLotNumber") || "";
      const costPrice =
        form.getValues("tempCostPrice") || selectedProduct.product.costPrice;
      const sellingPrice =
        form.getValues("tempSellingPrice") ||
        selectedProduct.product.sellingPrice;
      const manufactureDate =
        form.getValues("tempManufactureDate") || undefined;
      const expiryDate = form.getValues("tempExpiryDate") || undefined;

      if (!lotNumber) {
        toast.error("Lot number is required");
        return;
      }
      if (quantity <= 0) {
        toast.error("Quantity must be greater than 0");
        return;
      }
      if (costPrice <= 0) {
        toast.error("Cost price must be greater than 0");
        return;
      }
      if (sellingPrice <= 0) {
        toast.error("Selling price must be greater than 0");
        return;
      }

      const newProduct: FormProduct = {
        productId: selectedProduct.product.id,
        quantity,
        lotNumber,
        costPrice,
        sellingPrice,
        manufactureDate,
        expiryDate,
        productName: selectedProduct.product.name,
        productUnit: selectedProduct.unit.code,
      };

      if (editingIndex !== null) {
        update(editingIndex, newProduct);
        setEditingIndex(null);
      } else {
        append(newProduct);
      }

      handleCancel();
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Error adding product");
    }
  };

  const handleEditEntry = (index: number) => {
    const entry = fields[index];
    form.setValue("selectedProduct", entry.productId as string);
    form.setValue("tempQuantity", entry.quantity);
    form.setValue("tempLotNumber", entry.lotNumber);
    form.setValue("tempCostPrice", entry.costPrice);
    form.setValue("tempSellingPrice", entry.sellingPrice);
    form.setValue("tempManufactureDate", entry.manufactureDate);
    form.setValue("tempExpiryDate", entry.expiryDate);
    setSelectedProductName(entry.productName || "");
    setEditingIndex(index);
  };

  const handleDeleteEntry = (index: number) => {
    remove(index);
    if (editingIndex === index) {
      handleCancel();
    }
  };

  const handleCancel = () => {
    form.setValue("selectedProduct", "");
    form.setValue("tempQuantity", 0);
    form.setValue("tempLotNumber", "");
    form.setValue("tempCostPrice", 0);
    form.setValue("tempSellingPrice", 0);
    form.setValue("tempManufactureDate", undefined);
    form.setValue("tempExpiryDate", undefined);
    setEditingIndex(null);
    setSelectedProductName("");
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

  const handleSubmit = async (values: ExtendedStockAdjustmentFormValues) => {
    try {
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      if (fields.length === 0) {
        toast.error("At least one product is required");
        return;
      }

      // Validate all products before submission
      const isValid = await form.trigger("products");
      if (!isValid) {
        toast.error("Please fix product errors before submission");
        return;
      }

      const submissionData = {
        ...values,
        products: fields.map((field) => ({
          productId: field.productId,
          quantity: field.quantity,
          lotNumber: field.lotNumber,
          costPrice: field.costPrice,
          sellingPrice: field.sellingPrice,
          manufactureDate: field.manufactureDate || undefined,
          expiryDate: field.expiryDate || undefined,
        })),
      };

      await addInventoryStock(
        { data: submissionData, userId: user.id },
        {
          onSuccess: () => {
            toast.success("Inventory stock added successfully!");
            form.reset();
            router.push("/inventory/inventory-stocks");
          },
          onError: (error) => {
            console.error("Submission error:", error);
            toast.error("Failed to add inventory stock");
          },
        }
      );
    } catch (error) {
      console.error("Error in submission handler:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 pt-8 "
        >
          <div className="flex flex-col sm:flex-row gap-5">
            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="receivedDate"
              label="Recieved Date"
              dateFormat="MM/dd/yyyy"
            />

            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="storeId"
              label="Store"
              placeholder="Select store"
              onAddNew={() => setDialogOpen(true)}
              key={`store-select-${form.watch("storeId") || ""}`}
            >
              {storesLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
              {stores &&
                stores?.map((store: Store) => (
                  <SelectItem
                    key={store.id}
                    value={store.id}
                    className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white capitalize"
                  >
                    {store.name}
                  </SelectItem>
                ))}
            </CustomFormField>
          </div>

          <div
            className={`space-y-4 ${
              form.formState.errors.products && fields.length === 0
                ? "border-2 border-red-500 p-4 rounded-md"
                : ""
            }`}
          >
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
                              form.setValue("selectedProduct", product.id);
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
                    <div>No inventory found for this store</div>
                  </SelectItem>
                )}
              </CustomFormField>
            </div>
            <div className="w-full flex flex-col justify-between sm:flex-row gap-4 bg-blue-50 rounded-md p-4">
              <div className="flex w-full flex-col gap-5">
                <div className="flex w-full flex-col sm:flex-row gap-5">
                  <div className="flex flex-1 flex-col gap-3">
                    <p className="text-14-medium text-blue-800">Product Name</p>
                    <p className="text-14-medium bg-white text-blue-800 border border-dark-700 h-[42px] rounded-md flex items-center px-3 w-full shadow-sm min-w-[200px]">
                      {selectedProductName ?? "Select a product"}
                    </p>
                  </div>
                  <CustomFormField
                    fieldType={FormFieldType.INPUT}
                    control={form.control}
                    name="tempLotNumber"
                    label="Lot Number"
                    placeholder="Enter Lot number"
                  />
                  <CustomFormField
                    fieldType={FormFieldType.NUMBER}
                    control={form.control}
                    name="tempQuantity"
                    label="Quantity"
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="flex w-full flex-col sm:flex-row gap-5">
                  <CustomFormField
                    fieldType={FormFieldType.AMOUNT}
                    control={form.control}
                    name="tempCostPrice"
                    label="Cost Price"
                    placeholder="Enter cost price"
                  />
                  <CustomFormField
                    fieldType={FormFieldType.AMOUNT}
                    control={form.control}
                    name="tempSellingPrice"
                    label="Selling Price"
                    placeholder="Enter selling price"
                  />
                  <CustomFormField
                    fieldType={FormFieldType.DATE_PICKER}
                    control={form.control}
                    name="tempManufactureDate"
                    label="Manufacture Date"
                    dateFormat="MM/dd/yyyy"
                  />
                  <CustomFormField
                    fieldType={FormFieldType.DATE_PICKER}
                    control={form.control}
                    name="tempExpiryDate"
                    label="Expiry Date"
                    dateFormat="MM/dd/yyyy"
                  />
                </div>
              </div>
              <div className="flex flex-row gap-2 justify-end">
                <Button
                  type="button"
                  size={"icon"}
                  onClick={handleCancel}
                  className="self-end mb-1 shad-danger-btn"
                >
                  <X />
                </Button>

                <Button
                  type="button"
                  onClick={handleAddProduct}
                  className="self-end mb-1 shad-primary-btn"
                >
                  {editingIndex !== null ? "Update Product" : "Add Product"}
                </Button>
              </div>
            </div>

            <Table className="shad-table border border-light-200 rounded-lg">
              <TableHeader>
                <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Manufacture Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="w-full bg-white">
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      No products added
                    </TableCell>
                  </TableRow>
                )}
                {fields.map((entry, index) => (
                  <TableRow key={`${entry.productId}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{entry.productName}</TableCell>
                    <TableCell>{entry.lotNumber}</TableCell>
                    <TableCell>
                      {entry.quantity}
                      {entry.productUnit}
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={entry.costPrice} />
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={entry.sellingPrice} />
                    </TableCell>
                    <TableCell>
                      {entry.manufactureDate
                        ? formatDateTime(entry.manufactureDate).dateTime
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {entry.expiryDate
                        ? formatDateTime(entry.expiryDate).dateTime
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-row items-center">
                        <span
                          onClick={() => handleEditEntry(index)}
                          className="text-[#475BE8] p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                        >
                          <EditIcon className="h-5 w-5" />
                        </span>
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
              </TableBody>
            </Table>
            {form.formState.errors.products && fields.length === 0 && (
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
            placeholder="Enter notes"
          />

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={() => {
                form.reset();
                handleCancel();
              }}
              className="shad-danger-btn"
            >
              Cancel
            </Button>
            <SubmitButton
              isLoading={isAddingInventoryStock}
              className="shad-primary-btn"
            >
              Add Stock
            </SubmitButton>
          </div>
        </form>
      </Form>

      <StoreDialog
        mode="add"
        onSubmit={handleAddStore}
        open={dialogOpen}
        onOpenChange={closeDialog}
        isLoading={isAddingStore}
      />
    </>
  );
};

export default NewStockForm;
