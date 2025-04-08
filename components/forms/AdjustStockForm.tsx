import { useInventoryStock } from "@/hooks/useInventoryStock";
import {
  ExistingStockAdjustmentFormValidation,
  ExistingStockAdjustmentFormValues,
} from "@/lib/validation";
import { InventoryStockWithRelations, Store } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Form } from "../ui/form";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { SelectItem } from "../ui/select";
import { Button } from "../ui/button";
import SubmitButton from "../SubmitButton";
import { useStores } from "@/hooks/useStores";
import { useAuth } from "@/hooks/useAuth";
import Loading from "../loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import DeleteIcon from "@mui/icons-material/Delete";

interface AdjustmentEntry {
  inventoryStockId: string;
  productName?: string;
  productID?: string;
  lotNumber: string;
  currentQuantity: number;
  adjustmentType: "ADD" | "SUBTRACT";
  adjustmentQuantity: number;
  costPrice?: number;
  sellingPrice?: number;
  manufactureDate?: Date;
  expiryDate?: Date;
}

const AdjustStockForm = () => {
  const {
    inventoryStock,
    isLoading: inventoryStockLoading,
    adjustInventoryStock,
    isAdjustingInventoryStock,
  } = useInventoryStock({
    getAllInventoryStocks: true,
  });
  const { stores, isLoading: storesLoading } = useStores({
    getAllStores: true,
  });
  const { user } = useAuth();
  const router = useRouter();

  const defaultValues = {
    storeId: "",
    receivedDate: new Date(),
    notes: "",
    entries: [] as AdjustmentEntry[],
  };

  const form = useForm<ExistingStockAdjustmentFormValues>({
    resolver: zodResolver(ExistingStockAdjustmentFormValidation),
    mode: "all",
    defaultValues: defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  });

  const selectedStoreId = form.watch("storeId");
  const selectedInventoryStockId = form.watch("selectedInventoryStockId");

  // Filter inventory stock based on selected store
  const filteredInventoryStock = inventoryStock?.filter(
    (stock: InventoryStockWithRelations) => stock.store.id === selectedStoreId
  );

  const handleAddProduct = () => {
    if (!selectedInventoryStockId || !selectedStoreId) {
      toast.error("Please select a store and Inventory Stock");
      return;
    }

    const selectedStock = inventoryStock?.find(
      (stock: InventoryStockWithRelations) =>
        stock.inventory.id === selectedInventoryStockId
    );

    if (!selectedStock) {
      toast.error("Selected Inventory stock not found");
      return;
    }

    if (
      fields.some(
        (entry) => entry.inventoryStockId === selectedInventoryStockId
      )
    ) {
      toast.error("This product is already added");
      return;
    }

    const newEntry: AdjustmentEntry = {
      inventoryStockId: selectedStock.inventory.id,
      productName: selectedStock.product.name,
      productID: selectedStock.product.productID,
      lotNumber: selectedStock.inventory.lotNumber,
      currentQuantity: selectedStock.inventory.quantity,
      adjustmentType: "ADD",
      adjustmentQuantity: 0,
      costPrice: selectedStock.inventory.costPrice,
      sellingPrice: selectedStock.inventory.sellingPrice,
      manufactureDate: new Date(selectedStock.inventory.manufactureDate),
      expiryDate: new Date(selectedStock.inventory.expiryDate),
    };

    append(newEntry);
    form.setValue("selectedInventoryStockId", "");
  };

  const handleRemoveEntry = (index: number) => {
    remove(index);
  };

  const handleCancel = () => {
    form.reset(defaultValues);
    form.setValue("selectedInventoryStockId", "");
  };

  // In your handleSubmit function:
  const handleSubmit = async (values: ExistingStockAdjustmentFormValues) => {
    try {
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      // First trigger validation
      const isValid = await form.trigger();
      if (!isValid) {
        toast.error("Please fix all errors before submitting");
        return;
      }

      if (values.entries.length === 0) {
        toast.error("At least one inventory stock is required");
        return;
      }

      // Validate adjustment quantities
      for (const entry of values.entries) {
        if (entry.adjustmentQuantity <= 0) {
          toast.error(
            `Adjustment quantity must be greater than 0 for ${entry.productID} - ${entry.productName}`
          );
          return;
        }
        if (
          entry.adjustmentType === "SUBTRACT" &&
          entry.adjustmentQuantity > entry.currentQuantity
        ) {
          toast.error(
            `Cannot subtract more than current quantity (${entry.currentQuantity}) for ${entry.productName}`
          );
          return;
        }
      }

      const submissionData = {
        storeId: values.storeId,
        receivedDate: values.receivedDate,
        notes: values.notes,
        entries: values.entries.map((entry) => ({
          inventoryStockId: entry.inventoryStockId,
          adjustmentType: entry.adjustmentType,
          adjustmentQuantity: entry.adjustmentQuantity,
          currentQuantity: entry.currentQuantity,
          lotNumber: entry.lotNumber,
          productName: entry.productName,
          productID: entry.productID,
          costPrice: entry.costPrice,
          sellingPrice: entry.sellingPrice,
          manufactureDate: entry.manufactureDate
            ? new Date(entry.manufactureDate)
            : undefined,
          expiryDate: entry.expiryDate ? new Date(entry.expiryDate) : undefined,
        })),
      };

      await adjustInventoryStock(
        { data: submissionData, userId: user.id },
        {
          onSuccess: () => {
            toast.success("Inventory stock adjusted successfully!");
            form.reset(defaultValues);
            router.push("/inventory/inventory-stocks");
          },
          onError: (error) => {
            console.error("Error in submission handler:", error);
            toast.error("An unexpected error occurred");
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
        className="space-y-6 pt-8"
      >
        <div className="flex flex-col sm:flex-row gap-5">
          <CustomFormField
            fieldType={FormFieldType.DATE_PICKER}
            control={form.control}
            name="receivedDate"
            label="Adjustment Date"
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
        </div>
        <div
          className={`space-y-4 ${
            form.formState.errors.entries && fields.length === 0
              ? "border-2 border-red-500 p-4 rounded-md"
              : ""
          }`}
        >
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2">
                <CustomFormField
                  fieldType={FormFieldType.SELECT}
                  control={form.control}
                  name="selectedInventoryStockId"
                  label="Select Inventory Stock"
                  placeholder={
                    selectedStoreId
                      ? "Select inventory stock"
                      : "Select store first"
                  }
                  disabled={!selectedStoreId}
                >
                  {inventoryStockLoading ? (
                    <div className="py-4">
                      <Loading />
                    </div>
                  ) : filteredInventoryStock &&
                    filteredInventoryStock.length > 0 ? (
                    filteredInventoryStock.map(
                      (stock: InventoryStockWithRelations) => (
                        <SelectItem
                          key={stock.inventory.id}
                          value={stock.inventory.id}
                          className="text-14-medium text-dark-500 cursor-pointer hover:rounded hover:bg-blue-800 hover:text-white"
                        >
                          {stock.product.productID} - {stock.product.name} (Lot:{" "}
                          {stock.inventory.lotNumber}, Qty:{" "}
                          {stock.inventory.quantity})
                        </SelectItem>
                      )
                    )
                  ) : (
                    <SelectItem value="null" disabled>
                      {selectedStoreId
                        ? "No inventory found for this store"
                        : "Select a store first"}
                    </SelectItem>
                  )}
                </CustomFormField>
              </div>
              <Button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedInventoryStockId}
                className="self-end shad-primary-btn"
              >
                Add Inventory Stock
              </Button>
            </div>

            <Table className="shad-table border border-light-200 rounded-lg">
              <TableHeader>
                <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                  <TableHead>#</TableHead>
                  <TableHead>PID</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Current Qty</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Adjust Qty</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="w-full bg-white">
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No products added
                    </TableCell>
                  </TableRow>
                )}
                {fields.map((entry, index) => (
                  <TableRow key={entry.inventoryStockId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{entry.productID}</TableCell>
                    <TableCell>{entry.productName}</TableCell>
                    <TableCell>{entry.lotNumber}</TableCell>
                    <TableCell>{entry.currentQuantity}</TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.SELECT}
                        control={form.control}
                        name={`entries.${index}.adjustmentType`}
                        label=""
                        placeholder=""
                      >
                        <SelectItem value="ADD">Addition</SelectItem>
                        <SelectItem value="SUBTRACT">Subtraction</SelectItem>
                      </CustomFormField>
                    </TableCell>
                    <TableCell>
                      <CustomFormField
                        fieldType={FormFieldType.NUMBER}
                        control={form.control}
                        name={`entries.${index}.adjustmentQuantity`}
                        label=""
                        placeholder="Qty"
                      />
                      {form.formState.errors.entries?.[index]
                        ?.adjustmentQuantity && (
                        <p className="text-red-500 text-xs mt-1">
                          {
                            form.formState.errors.entries[index]
                              ?.adjustmentQuantity?.message
                          }
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        onClick={() => handleRemoveEntry(index)}
                        className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                      >
                        <DeleteIcon className="h-5 w-5" />
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {form.formState.errors.entries && fields.length === 0 && (
            <p className="shad-error text-xs">
              {form.formState.errors.entries.message}
            </p>
          )}
        </div>

        <CustomFormField
          fieldType={FormFieldType.TEXTAREA}
          control={form.control}
          name="notes"
          label="Notes"
          placeholder="Enter notes for this adjustment"
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
            isLoading={isAdjustingInventoryStock}
            className="shad-primary-btn"
          >
            Adjust Stock
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default AdjustStockForm;
