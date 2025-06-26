import { InventoryStockWithRelations, WaybillInventoryStock } from "@/types";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import DeleteIcon from "@mui/icons-material/Delete";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Search } from "lucide-react";
import { Check } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import {
  WaybillInventoryStockAllocationFormValues,
  WaybillInventoryStockAllocationValidation,
} from "@/lib/validation";
import toast from "react-hot-toast";
import { X } from "lucide-react";

interface WaybillInventoryStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productID: string;
  requiredQuantity: number;
  availableStocks: InventoryStockWithRelations[];
  selectedInventoryStock: WaybillInventoryStock[];
  onSave: (stock: WaybillInventoryStock[]) => void;
}

const WaybillInventoryStockSelectDialog = ({
  open,
  onOpenChange,
  productID,
  requiredQuantity,
  availableStocks,
  selectedInventoryStock,
  onSave,
}: WaybillInventoryStockDialogProps) => {
  const [prevSelectedInventoryStockId, setPrevSelectedInventoryStockId] =
    useState<string | null>(null);

  // Initialize React Hook Form
  const form = useForm<WaybillInventoryStockAllocationFormValues>({
    resolver: zodResolver(WaybillInventoryStockAllocationValidation),
    defaultValues: {
      inventoryStock: [],
      searchQuery: "",
    },
  });

  const {
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = form;

  // Watch form values
  const inventoryStock = watch("inventoryStock");
  const searchQuery = watch("searchQuery");

  // Memoize calculated values to prevent unnecessary re-renders
  const totalAllocated = useMemo(
    () => inventoryStock.reduce((sum, item) => sum + item.quantityTaken, 0),
    [inventoryStock]
  );

  // Calculate remaining quantity from regular stock
  const remainingFromStock = useMemo(
    () => requiredQuantity - totalAllocated,
    [requiredQuantity, totalAllocated]
  );

  const remainingQty = useMemo(
    () => requiredQuantity - totalAllocated,
    [requiredQuantity, totalAllocated]
  );

  const totalAvailable = useMemo(
    () =>
      availableStocks.reduce((sum, stock) => sum + stock.inventory.quantity, 0),
    [availableStocks]
  );

  // Clean up state when dialog closes
  const resetState = useCallback(() => {
    reset({
      inventoryStock: [],
      searchQuery: "",
    });
    setPrevSelectedInventoryStockId(null);
  }, [reset]);

  // Auto-populate inventory stock
  const autoPopulateStock = useCallback(
    (
      stocks: InventoryStockWithRelations[],
      requiredQty: number
    ): { allocations: WaybillInventoryStock[] } => {
      let remaining = requiredQty;
      const newAllocations: WaybillInventoryStock[] = [];

      if (stocks.length > 0) {
        for (const stock of stocks) {
          if (remaining <= 0) break;
          if (stock.inventory.quantity <= 0) continue;

          const quantityTaken = Math.min(stock.inventory.quantity, remaining);

          newAllocations.push({
            inventoryStockId: stock.inventory.id,
            lotNumber: stock.inventory.lotNumber,
            quantityTaken,
            unitPrice: stock.product.sellingPrice,
          });

          remaining -= quantityTaken;
        }
      } else {
        // No stocks available,
        remaining = requiredQty;
      }

      return {
        allocations: newAllocations,
      };
    },
    []
  );

  // Initialize state when dialog opens
  useEffect(() => {
    if (open) {
      if (selectedInventoryStock.length === 0) {
        const { allocations } = autoPopulateStock(
          availableStocks,
          requiredQuantity
        );
        setValue("inventoryStock", allocations);
      } else {
        setValue("inventoryStock", [...selectedInventoryStock]);
      }
    } else {
      // Clean up when dialog closes
      resetState();
    }
  }, [
    open,
    selectedInventoryStock,
    availableStocks,
    requiredQuantity,
    resetState,
    autoPopulateStock,
    setValue,
  ]);

  const addStock = (stock: InventoryStockWithRelations) => {
    if (remainingFromStock <= 0) return;

    const currentStock = getValues("inventoryStock");

    // Check if this stock is already selected
    const existingStockIndex = currentStock.findIndex(
      (item) => item.inventoryStockId === stock.inventory.id
    );

    if (existingStockIndex !== -1) {
      // Update existing stock quantity instead of adding duplicate
      const existingStock = currentStock[existingStockIndex];
      const maxAdditional = Math.min(
        stock.inventory.quantity - existingStock.quantityTaken,
        remainingFromStock
      );

      if (maxAdditional > 0) {
        const updatedStock = [...currentStock];
        updatedStock[existingStockIndex] = {
          ...existingStock,
          quantityTaken: existingStock.quantityTaken + maxAdditional,
        };
        setValue("inventoryStock", updatedStock);
      }
    } else {
      // Add new stock
      const maxTake = Math.min(stock.inventory.quantity, remainingFromStock);
      const newStockEntry = {
        inventoryStockId: stock.inventory.id,
        lotNumber: stock.inventory.lotNumber,
        quantityTaken: maxTake,
        unitPrice: stock.product.sellingPrice,
      };

      setValue("inventoryStock", [...currentStock, newStockEntry]);
    }

    setPrevSelectedInventoryStockId(stock.inventory.id);
  };

  const removeInventoryStock = (index: number) => {
    const currentStock = getValues("inventoryStock");
    const newStock = [...currentStock];
    newStock.splice(index, 1);
    setValue("inventoryStock", newStock);
  };

  const updateStockQuantity = (index: number, newQuantity: number) => {
    const currentStock = getValues("inventoryStock");
    const stock = currentStock[index];
    if (!stock || newQuantity < 0) return;

    const availableStock = availableStocks.find(
      (s) => s.inventory.id === stock.inventoryStockId
    );

    let maxQuantity = newQuantity;

    if (availableStock) {
      // Don't exceed available quantity
      maxQuantity = Math.min(newQuantity, availableStock.inventory.quantity);
    }

    // Calculate what the new total would be
    const currentTotal = currentStock.reduce(
      (sum, item, i) => (i === index ? sum : sum + item.quantityTaken),
      0
    );
    const newTotal = currentTotal + maxQuantity;

    // Prevent over-allocation
    if (newTotal > requiredQuantity) {
      maxQuantity = Math.max(0, requiredQuantity - currentTotal);
    }

    const updatedStock = currentStock.map((item, i) =>
      i === index ? { ...item, quantityTaken: maxQuantity } : item
    );

    setValue("inventoryStock", updatedStock);
  };

  const handleSaveAllocation = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate total allocated vs required
    const totalAllocatedQty = totalAllocated;

    if (totalAllocatedQty !== requiredQuantity) {
      if (totalAllocatedQty < requiredQuantity) {
        const shortage = requiredQuantity - totalAllocatedQty;
        toast.error(
          `Cannot save allocation. You need to allocate ${shortage} more items.`
        );
      } else {
        const excess = totalAllocatedQty - requiredQuantity;
        toast.error(
          `Cannot save allocation. You have over-allocated by ${excess} items. Please reduce the quantities.`
        );
      }
      return;
    }

    const currentStock = getValues("inventoryStock");

    // Filter out any invalid entries
    const validStock = currentStock.filter(
      (stock) => stock.quantityTaken > 0 && stock.inventoryStockId !== ""
    );

    if (validStock.length === 0) {
      toast.error("Please allocate stock before saving.");
      return;
    }

    onSave(validStock);
    onOpenChange(false);
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any form submission from bubbling up
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };

  // Filter available stocks based on search query
  const filteredStocks = availableStocks.filter((stock) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      stock.inventory.lotNumber?.toLowerCase().includes(query) ||
      stock.product.name?.toLowerCase().includes(query) ||
      stock.product.productID?.toLowerCase().includes(query)
    );
  });

  // Create display rows for the selected stock table
  const displayRows = useMemo(() => {
    const rows = [...inventoryStock];

    return rows;
  }, [inventoryStock]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-light-200">
        <DialogHeader>
          <DialogTitle>Allocate Stock for {productID}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-14-medium">
                Required Quantity: {requiredQuantity}
              </h3>
              <p className="text-blue-800">Total Available: {totalAvailable}</p>
            </div>
            <div className="text-right">
              <span
                className={
                  remainingQty === 0 ? "text-green-500" : "text-orange-500"
                }
              >
                Remaining quantity: {remainingQty}
              </span>
              {remainingQty < 0 && (
                <div className="text-red-500 text-sm mt-1">
                  ⚠️ Over-allocation detected! Remove excess quantity.
                </div>
              )}
            </div>
          </div>

          {/* Form validation errors */}
          {errors.inventoryStock && (
            <div className="text-red-500 text-sm">
              {errors.inventoryStock.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-end">
            <div className="w-full sm:w-1/2">
              <p className="text-14-medium my-2">Select stock to add</p>
              <Select
                disabled={
                  availableStocks.length === 0 ||
                  remainingFromStock <= 0 ||
                  remainingQty <= 0
                }
              >
                <SelectTrigger className="shad-select-trigger">
                  <SelectValue
                    placeholder={
                      remainingFromStock <= 0
                        ? "Stock allocation complete"
                        : availableStocks.length === 0
                        ? "No stock available"
                        : "Select stock to add"
                    }
                  />
                </SelectTrigger>

                <SelectContent
                  className="shad-select-content"
                  onCloseAutoFocus={(e) => {
                    e.preventDefault();
                  }}
                >
                  <div className="py-3">
                    <div className="relative flex items-center rounded-md border border-dark-700 bg-white">
                      <Search className="ml-2 h-4 w-4 opacity-50" />
                      <Input
                        type="text"
                        placeholder="Search by Product ID, Product Name, Lot Number"
                        value={searchQuery}
                        onChange={(e) =>
                          setValue("searchQuery", e.target.value)
                        }
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setValue("searchQuery", "")}
                          className="absolute right-3 top-3 text-dark-700 hover:text-dark-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {filteredStocks && filteredStocks.length > 0 ? (
                    <>
                      <Table className="shad-table border border-light-200 rounded-lg bg-white">
                        <TableHeader>
                          <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                            <TableHead>Lot Number</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead>Available</TableHead>
                            <TableHead>Selected</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="w-full bg-white">
                          {filteredStocks.map(
                            (stock: InventoryStockWithRelations) => {
                              const selectedStock = inventoryStock.find(
                                (item) =>
                                  item.inventoryStockId === stock.inventory.id
                              );
                              const isRecentlySelected =
                                prevSelectedInventoryStockId ===
                                stock.inventory.id;

                              return (
                                <TableRow
                                  key={stock.inventory.id}
                                  className="cursor-pointer hover:bg-blue-50"
                                  onClick={() => {
                                    addStock(stock);
                                    setValue("searchQuery", "");
                                    // Find and click the hidden SelectItem with this value
                                    const selectItem = document.querySelector(
                                      `[data-value="${stock.inventory.id}"]`
                                    ) as HTMLElement;
                                    if (selectItem) {
                                      selectItem.click();
                                    }
                                  }}
                                >
                                  <TableCell>
                                    {stock.inventory.lotNumber}
                                  </TableCell>
                                  <TableCell>
                                    {stock.inventory.expiryDate
                                      ? formatDateTime(
                                          stock.inventory.expiryDate
                                        ).dateTime
                                      : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    {stock.inventory.quantity}
                                  </TableCell>
                                  <TableCell>
                                    {selectedStock?.quantityTaken || 0}
                                  </TableCell>
                                  <TableCell className="w-10">
                                    {isRecentlySelected && (
                                      <span className="text-blue-800">
                                        <Check className="h-5 w-5" />
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          )}
                        </TableBody>
                      </Table>
                      {/* Hidden select options for form control */}
                      <div className="hidden">
                        {filteredStocks.map(
                          (stock: InventoryStockWithRelations) => (
                            <SelectItem
                              key={stock.inventory.id}
                              value={stock.inventory.id}
                              data-value={stock.inventory.id}
                            >
                              {stock.inventory.lotNumber}
                            </SelectItem>
                          )
                        )}
                      </div>
                    </>
                  ) : (
                    <SelectItem value="null" disabled>
                      <div>
                        {searchQuery
                          ? "No matching inventory stock found"
                          : "No inventory stock available for this product"}
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected Inventory Stock */}
          <div className="w-full">
            <h4 className="font-medium mb-3">Selected Stock Allocation:</h4>
            <Table className="shad-table border border-light-200 rounded-lg bg-white">
              <TableHeader>
                <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Quantity to Take</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No stock allocated yet
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((stock, index) => {
                    const mainStock = availableStocks.find(
                      (s) => s.inventory.id === stock.inventoryStockId
                    );

                    return (
                      <TableRow key={stock.inventoryStockId || index}>
                        <TableCell>{stock.lotNumber}</TableCell>
                        <TableCell>
                          {mainStock?.inventory.expiryDate
                            ? formatDateTime(mainStock.inventory.expiryDate)
                                .dateTime
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {mainStock?.inventory.quantity || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={mainStock?.inventory.quantity}
                            value={stock.quantityTaken}
                            onChange={(e) =>
                              updateStockQuantity(
                                index,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-row items-center">
                            <span
                              onClick={() => removeInventoryStock(index)}
                              className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                              title="Remove stock allocation"
                            >
                              <DeleteIcon className="h-4 w-4" />
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={handleCancel}
              className="shad-danger-btn"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveAllocation}
              className="shad-primary-btn"
              disabled={displayRows.length === 0 || remainingQty !== 0}
            >
              Save Allocation
              {remainingQty !== 0 && ` (${remainingQty} remaining)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WaybillInventoryStockSelectDialog;
