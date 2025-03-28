import { useProducts } from "@/hooks/useProducts";
import { getProductById } from "@/lib/actions/product.actions";
import { getUnitById } from "@/lib/actions/unit.actions";
import {
  StockAdjustmentFormValidation,
  StockAdjustmentFormValues,
} from "@/lib/validation";
import { Product, Store, Unit } from "@/types";
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
import Loading from "../loading";

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
  const { products, isLoading: productsLoading } = useProducts({
    getAllProducts: true,
  });
  const { stores, isLoading: storesLoading } = useStores({
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

  // Handle product selection
  useEffect(() => {
    const updateSelectedProduct = async () => {
      if (!selectedProductId) return;

      try {
        const product = await getProductById(selectedProductId);
        setSelectedProductName(product.name);
      } catch (error) {
        console.error("Error fetching product:", error);
        setSelectedProductName("");
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
      )) as Product;
      if (!selectedProduct) {
        throw new Error("Product not found");
      }

      const selectedProductUnit = (await getUnitById(
        selectedProduct.unitId
      )) as Unit;

      const quantity = form.getValues("tempQuantity") || 0;
      const lotNumber = form.getValues("tempLotNumber") || "";
      const costPrice = form.getValues("tempCostPrice") || 0;
      const sellingPrice = form.getValues("tempSellingPrice") || 0;
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
        productId: selectedProduct.id,
        quantity,
        lotNumber,
        costPrice,
        sellingPrice,
        manufactureDate,
        expiryDate,
        productName: selectedProduct.name,
        productUnit: selectedProductUnit.code,
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

      console.log("Submitting:", submissionData); // Debug log

      await addInventoryStock(
        { data: submissionData, userId: user.id },
        {
          onSuccess: () => {
            toast.success("Inventory stock added successfully!");
            form.reset();
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
            onAddNew={() => router.push("/settings/stores")}
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
              name="selectedProduct"
              label="Select Product"
              placeholder="Select product"
              onAddNew={() => router.push("/inventory/add-inventory")}
            >
              {productsLoading && (
                <div className="py-4">
                  <Loading />
                </div>
              )}
              {products &&
                products?.map((product: Product) => (
                  <SelectItem
                    key={product.id}
                    value={product.id}
                    className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                  >
                    {product.name}
                  </SelectItem>
                ))}
            </CustomFormField>
          </div>
          <div className="w-full flex flex-col justify-between sm:flex-row gap-4">
            <div className="flex w-full flex-col gap-5">
              <div className="flex w-full flex-col sm:flex-row gap-5">
                <div className="flex flex-1 flex-col gap-3">
                  <p className="text-14-medium text-blue-800">Product Name</p>
                  <p className="text-14-medium bg-white text-blue-800 border border-dark-700 h-[42px] rounded-md flex items-center px-3 w-full shadow-sm min-w-[200px]">
                    {selectedProductName || "Select a product"}
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
            onClick={() => form.reset()}
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
  );
};

export default NewStockForm;
