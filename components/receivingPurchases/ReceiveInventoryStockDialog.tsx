import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  ReceivedInventoryStockValidation,
  ReceivedInventoryStockValues,
} from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import DeleteIcon from "@mui/icons-material/Delete";
import { useCallback, useEffect } from "react";
import FormatNumber from "../FormatNumber";
import { Form } from "../ui/form";

interface RceiveInventoryStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ReceivedInventoryStockValues) => void;
  costPrice: number;
  productID: string;
  pendingQuantity: number;
}

const ReceiveInventoryStockDialog = ({
  open,
  onOpenChange,
  costPrice,
  onSave,
  productID,
  pendingQuantity,
}: RceiveInventoryStockDialogProps) => {
  const form = useForm<ReceivedInventoryStockValues>({
    resolver: zodResolver(ReceivedInventoryStockValidation),
    defaultValues: {
      inventoryStock: [],
      totalCost: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "inventoryStock",
  });

  const watchedFields = fields.map((_, index) => ({
    quantity: form.watch(`inventoryStock.${index}.quantity`),
  }));

  // Calculate total quantity across all inventory stock entries
  const calculateTotalQuantity = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      const quantity = form.watch(`inventoryStock.${index}.quantity`) || 0;
      total += quantity;
    });
    return total;
  }, [fields, form]);

  // Get current total quantity
  const totalQuantity = calculateTotalQuantity();

  // Check if total quantity exceeds pending quantity
  const isQuantityExceeded = totalQuantity > pendingQuantity;
  const remainingQuantity = pendingQuantity - totalQuantity;

  const handleAddRow = () => {
    append({
      lotNumber: "",
      quantity: 0,
      manufactureDate: undefined,
      expiryDate: undefined,
    });
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    form.reset();
    onOpenChange(false);
  };

  const handleDeleteEntry = (index: number) => {
    remove(index);
  };

  const calculateEntryTotalCost = useCallback(
    (index: number) => {
      const quantity = form.watch(`inventoryStock.${index}.quantity`) || 0;
      return quantity * costPrice;
    },
    [costPrice, form]
  );

  const calculateTotalCost = useCallback(() => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateEntryTotalCost(index);
    });
    return total;
  }, [fields, calculateEntryTotalCost]);

  const onSubmit = (data: ReceivedInventoryStockValues) => {
    try {
      if (totalQuantity > pendingQuantity) {
        form.setError("inventoryStock", {
          type: "manual",
          message: `Total quantity (${totalQuantity}) cannot exceed pending quantity (${pendingQuantity})`,
        });
        return;
      }

      if (totalQuantity === 0) {
        form.setError("inventoryStock", {
          type: "manual",
          message:
            "At least one inventory stock entry with quantity > 0 is required",
        });
        return;
      }
      onSave(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      return;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    form.handleSubmit(onSubmit)(e);
  };

  useEffect(() => {
    if (fields.length > 0) {
      form.setValue("totalCost", calculateTotalCost());
    }
  }, [watchedFields, fields, form, calculateTotalCost]);

  // Clear form errors when quantity changes and is within limits
  useEffect(() => {
    if (!isQuantityExceeded && form.formState.errors.inventoryStock) {
      form.clearErrors("inventoryStock");
    }
  }, [totalQuantity, isQuantityExceeded, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100rem] bg-light-200 overflow-visible">
        <DialogHeader>
          <DialogTitle className="pb-2">
            Receiving Stock for {productID}
          </DialogTitle>
          <div className="bg-blue-50 rounded-md px-5 py-2 border shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-dark-500">Pending Quantity:</span>
                <p className="font-semibold pt-1 text-blue-800">
                  {pendingQuantity}
                </p>
              </div>
              <div>
                <span className="text-dark-500">Total Entered:</span>
                <p
                  className={`font-semibold pt-1 ${
                    isQuantityExceeded ? "text-red-600" : "text-green-500"
                  }`}
                >
                  {totalQuantity}
                </p>
              </div>
              <div>
                <span className="text-dark-500">Remaining:</span>
                <p
                  className={`font-semibold pt-1 ${
                    remainingQuantity < 0 ? "text-red-600" : "text-green-500"
                  }`}
                >
                  {remainingQuantity}
                </p>
              </div>
              <div>
                <span className="text-dark-500">Total Cost:</span>
                <p className="font-semibold pt-1 text-green-500">
                  <FormatNumber value={calculateTotalCost()} />
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5 text-dark-500">
            <div className="space-y-5">
              {isQuantityExceeded && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-700 text-sm font-medium">
                    ⚠️ Total quantity ({totalQuantity}) exceeds pending quantity
                    ({pendingQuantity}). Please adjust the quantities before
                    saving.
                  </p>
                </div>
              )}

              <div className="w-full max-h-[70vh] overflow-y-auto overflow-x-visible relative">
                <Table className="shad-table border border-light-200 rounded-lg bg-white">
                  <TableHeader>
                    <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                      <TableHead>#</TableHead>
                      <TableHead>Lot Number</TableHead>
                      <TableHead>Qnty</TableHead>
                      <TableHead>Manufacture Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          No stock
                        </TableCell>
                      </TableRow>
                    )}
                    {fields.length > 0 &&
                      fields.map((entry, index) => (
                        <TableRow
                          key={`${entry.id}-${index}`}
                          className={`w-full ${
                            index % 2 === 1 ? "bg-blue-50" : ""
                          }`}
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <CustomFormField
                              fieldType={FormFieldType.INPUT}
                              control={form.control}
                              name={`inventoryStock.${index}.lotNumber`}
                              label=""
                              placeholder="Lot Number"
                            />
                          </TableCell>
                          <TableCell>
                            <CustomFormField
                              fieldType={FormFieldType.NUMBER}
                              control={form.control}
                              name={`inventoryStock.${index}.quantity`}
                              label=""
                              placeholder="Qty"
                            />
                          </TableCell>
                          <TableCell>
                            <CustomFormField
                              fieldType={FormFieldType.DATE_PICKER}
                              control={form.control}
                              name={`inventoryStock.${index}.manufactureDate`}
                              label=""
                              dateFormat="MM/dd/yyyy"
                            />
                          </TableCell>
                          <TableCell>
                            <CustomFormField
                              fieldType={FormFieldType.DATE_PICKER}
                              control={form.control}
                              name={`inventoryStock.${index}.expiryDate`}
                              label=""
                              dateFormat="MM/dd/yyyy"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-14-medium text-blue-800 rounded-md border bg-white px-3 border-dark-700 h-11">
                              <FormatNumber value={costPrice} />
                            </div>
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
                      ))}
                  </TableBody>
                </Table>
                {form.formState.errors.inventoryStock && (
                  <p className="text-red-500 text-xs pt-2">
                    {form.formState.errors?.inventoryStock.message}
                  </p>
                )}
              </div>

              <div className="flex flex-row items-center justify-between gap-5">
                <Button
                  type="button"
                  className="shad-primary-btn"
                  onClick={handleAddRow}
                  disabled={isQuantityExceeded}
                  title={
                    isQuantityExceeded
                      ? "Cannot add more rows - quantity limit exceeded"
                      : "Add new inventory stock row"
                  }
                >
                  Add Row
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    className="shad-danger-btn"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="shad-primary-btn"
                    disabled={isQuantityExceeded || totalQuantity === 0}
                    title={
                      isQuantityExceeded
                        ? "Cannot save - quantity limit exceeded"
                        : totalQuantity === 0
                        ? "Cannot save - no quantities entered"
                        : "Save inventory stock entries"
                    }
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveInventoryStockDialog;
