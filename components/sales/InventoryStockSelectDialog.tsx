import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { InventoryStockWithRelations, SelectedInventoryStock } from "@/types";
import { X } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { Check } from "lucide-react";
import DeleteIcon from "@mui/icons-material/Delete";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  InventoryStockAllocationFormValues,
  InventoryStockAllocationValidation,
} from "@/lib/validation";

interface InventoryStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productID: string;
  requiredQuantity: number;
  availableStocks: InventoryStockWithRelations[];
  selectedInventoryStock: SelectedInventoryStock[];
  onSave: (
    stock: SelectedInventoryStock[],
    hasBackorder: boolean,
    backorderQuantity: number
  ) => void;
  hasBackorder: boolean;
  backorderQuantity: number;
}

const InventoryStockSelectDialog = ({
  open,
  onOpenChange,
  productID,
  requiredQuantity,
  availableStocks,
  selectedInventoryStock,
  onSave,
  hasBackorder: initialHasBackorder,
  backorderQuantity: initialBackorderQuantity,
}: InventoryStockDialogProps) => {
  const [prevSelectedInventoryStockId, setPrevSelectedInventoryStockId] =
    useState<string | null>(null);

  // Simplified backorder state management
  const [includeBackorder, setIncludeBackorder] = useState(initialHasBackorder);
  const [backorderQuantity, setBackorderQuantity] = useState(
    initialBackorderQuantity
  );

  // Initialize React Hook Form
  const form = useForm<InventoryStockAllocationFormValues>({
    resolver: zodResolver(InventoryStockAllocationValidation),
    defaultValues: {
      inventoryStock: [],
      includeBackorder: initialHasBackorder,
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
    () => inventoryStock.reduce((sum, item) => sum + item.quantityToTake, 0),
    [inventoryStock]
  );

  // Calculate remaining quantity from regular stock
  const remainingFromStock = useMemo(
    () => requiredQuantity - totalAllocated,
    [requiredQuantity, totalAllocated]
  );

  // Calculate total allocated including backorder for display
  const totalAllocatedWithBackorder = useMemo(
    () => totalAllocated + (includeBackorder ? backorderQuantity : 0),
    [totalAllocated, includeBackorder, backorderQuantity]
  );

  const remainingQtyWithBackorder = useMemo(
    () => requiredQuantity - totalAllocatedWithBackorder,
    [requiredQuantity, totalAllocatedWithBackorder]
  );

  const totalAvailable = useMemo(
    () =>
      availableStocks.reduce((sum, stock) => sum + stock.inventory.quantity, 0),
    [availableStocks]
  );

  // Only show backorder switch if total available is less than required quantity
  const shouldShowBackorderSwitch = useMemo(
    () => totalAvailable < requiredQuantity,
    [totalAvailable, requiredQuantity]
  );

  // Clean up state when dialog closes
  const resetState = useCallback(() => {
    reset({
      inventoryStock: [],
      includeBackorder: initialHasBackorder,
      searchQuery: "",
    });
    setIncludeBackorder(initialHasBackorder);
    setBackorderQuantity(initialBackorderQuantity);
    setPrevSelectedInventoryStockId(null);
  }, [reset, initialHasBackorder, initialBackorderQuantity]);

  // Auto-populate inventory stock
  const autoPopulateStock = useCallback(
    (
      stocks: InventoryStockWithRelations[],
      requiredQty: number
    ): { allocations: SelectedInventoryStock[]; backorderQty: number } => {
      let remaining = requiredQty;
      const newAllocations: SelectedInventoryStock[] = [];

      if (stocks.length > 0) {
        for (const stock of stocks) {
          if (remaining <= 0) break;
          if (stock.inventory.quantity <= 0) continue;

          const quantityToTake = Math.min(stock.inventory.quantity, remaining);

          newAllocations.push({
            inventoryStockId: stock.inventory.id,
            lotNumber: stock.inventory.lotNumber,
            quantityToTake,
          });

          remaining -= quantityToTake;
        }
      } else {
        // No stocks available, remaining becomes backorder quantity
        remaining = requiredQty;
      }

      return {
        allocations: newAllocations,
        backorderQty: remaining,
      };
    },
    []
  );

  // Initialize state when dialog opens
  useEffect(() => {
    if (open) {
      if (selectedInventoryStock.length === 0) {
        const { allocations, backorderQty } = autoPopulateStock(
          availableStocks,
          requiredQuantity
        );
        setValue("inventoryStock", allocations);

        // Set backorder state based on shortage
        const needsBackorder = backorderQty > 0;
        setIncludeBackorder(needsBackorder);
        setBackorderQuantity(backorderQty);
        setValue("includeBackorder", needsBackorder);
      } else {
        setValue("inventoryStock", [...selectedInventoryStock]);
        setIncludeBackorder(initialHasBackorder);
        setBackorderQuantity(initialBackorderQuantity);
        setValue("includeBackorder", initialHasBackorder);
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
    initialHasBackorder,
    initialBackorderQuantity,
  ]);

  // Update backorder quantity when remaining quantity changes
  useEffect(() => {
    if (includeBackorder && remainingFromStock > 0) {
      setBackorderQuantity(remainingFromStock);
    } else if (!includeBackorder) {
      setBackorderQuantity(0);
    }
  }, [includeBackorder, remainingFromStock]);

  // Handle backorder switch toggle
  const handleBackorderToggle = (checked: boolean) => {
    setIncludeBackorder(checked);
    setValue("includeBackorder", checked);

    if (checked && remainingFromStock > 0) {
      setBackorderQuantity(remainingFromStock);
    } else {
      setBackorderQuantity(0);
    }
  };

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
        stock.inventory.quantity - existingStock.quantityToTake,
        remainingFromStock
      );

      if (maxAdditional > 0) {
        const updatedStock = [...currentStock];
        updatedStock[existingStockIndex] = {
          ...existingStock,
          quantityToTake: existingStock.quantityToTake + maxAdditional,
        };
        setValue("inventoryStock", updatedStock);
      }
    } else {
      // Add new stock
      const maxTake = Math.min(stock.inventory.quantity, remainingFromStock);
      const newStockEntry = {
        inventoryStockId: stock.inventory.id,
        lotNumber: stock.inventory.lotNumber,
        quantityToTake: maxTake,
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
      (sum, item, i) => (i === index ? sum : sum + item.quantityToTake),
      0
    );
    const newTotal = currentTotal + maxQuantity;

    // Prevent over-allocation
    if (newTotal > requiredQuantity) {
      maxQuantity = Math.max(0, requiredQuantity - currentTotal);
    }

    const updatedStock = currentStock.map((item, i) =>
      i === index ? { ...item, quantityToTake: maxQuantity } : item
    );

    setValue("inventoryStock", updatedStock);
  };

  const updateBackorderQuantity = (newQuantity: number) => {
    if (newQuantity < 0) return;

    // Calculate what the new total would be
    const currentStockTotal = inventoryStock.reduce(
      (sum, item) => sum + item.quantityToTake,
      0
    );
    const newTotal = currentStockTotal + newQuantity;

    // Prevent over-allocation
    let maxBackorderQuantity = newQuantity;
    if (newTotal > requiredQuantity) {
      maxBackorderQuantity = Math.max(0, requiredQuantity - currentStockTotal);
    }

    setBackorderQuantity(maxBackorderQuantity);

    // Update the switch state if backorder quantity becomes 0
    if (maxBackorderQuantity === 0) {
      setIncludeBackorder(false);
      setValue("includeBackorder", false);
    } else if (!includeBackorder) {
      setIncludeBackorder(true);
      setValue("includeBackorder", true);
    }
  };

  const handleSaveAllocation = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate total allocated vs required
    const totalAllocatedQty =
      totalAllocated + (includeBackorder ? backorderQuantity : 0);

    if (totalAllocatedQty !== requiredQuantity) {
      if (totalAllocatedQty < requiredQuantity) {
        const shortage = requiredQuantity - totalAllocatedQty;
        alert(
          `Cannot save allocation. You need to allocate ${shortage} more items. Consider enabling backorder to fulfill the shortage.`
        );
      } else {
        const excess = totalAllocatedQty - requiredQuantity;
        alert(
          `Cannot save allocation. You have over-allocated by ${excess} items. Please reduce the quantities.`
        );
      }
      return;
    }

    const currentStock = getValues("inventoryStock");

    // Filter out any invalid entries
    const validStock = currentStock.filter(
      (stock) => stock.quantityToTake > 0 && stock.inventoryStockId !== ""
    );

    if (validStock.length === 0 && !includeBackorder) {
      alert("Please allocate stock before saving.");
      return;
    }

    onSave(validStock, includeBackorder, backorderQuantity);
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

    // Add backorder row if it exists
    if (includeBackorder && backorderQuantity > 0) {
      rows.push({
        inventoryStockId: "BACKORDER_DISPLAY",
        lotNumber: "",
        quantityToTake: backorderQuantity,
      });
    }

    return rows;
  }, [inventoryStock, includeBackorder, backorderQuantity]);

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
                  remainingQtyWithBackorder === 0
                    ? "text-green-500"
                    : "text-orange-500"
                }
              >
                Remaining quantity: {remainingQtyWithBackorder}
              </span>
              {includeBackorder && backorderQuantity > 0 && (
                <div className="text-red-500 text-sm mt-1">
                  ⚠️ This order includes backordered items ({backorderQuantity}{" "}
                  items)
                </div>
              )}
              {remainingQtyWithBackorder < 0 && (
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
                  remainingQtyWithBackorder <= 0
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
                                    {selectedStock?.quantityToTake || 0}
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

            {/* Backorder switch - only show if total available is less than required */}
            {shouldShowBackorderSwitch && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="backorder"
                  checked={includeBackorder}
                  onCheckedChange={handleBackorderToggle}
                  className="custom-switch shad-switch"
                />
                <Label htmlFor="backorder">
                  Include backorder for shortage
                  {remainingFromStock > 0 && ` (${remainingFromStock} items)`}
                </Label>
              </div>
            )}
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
                    const isBackorder =
                      stock.inventoryStockId === "BACKORDER_DISPLAY";
                    const actualIndex = isBackorder ? -1 : index;

                    return (
                      <TableRow
                        key={stock.inventoryStockId || `backorder-${index}`}
                        className={isBackorder ? "bg-orange-50" : ""}
                      >
                        <TableCell>
                          {isBackorder ? "Backorder" : stock.lotNumber}
                        </TableCell>
                        <TableCell>
                          {mainStock?.inventory.expiryDate
                            ? formatDateTime(mainStock.inventory.expiryDate)
                                .dateTime
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {isBackorder
                            ? "∞"
                            : mainStock?.inventory.quantity || "N/A"}
                        </TableCell>
                        <TableCell>
                          {isBackorder ? (
                            <Input
                              type="number"
                              min="0"
                              value={stock.quantityToTake}
                              onChange={(e) =>
                                updateBackorderQuantity(
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-20"
                            />
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              max={mainStock?.inventory.quantity}
                              value={stock.quantityToTake}
                              onChange={(e) =>
                                updateStockQuantity(
                                  actualIndex,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-20"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-row items-center">
                            {!isBackorder && (
                              <span
                                onClick={() =>
                                  removeInventoryStock(actualIndex)
                                }
                                className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                                title="Remove stock allocation"
                              >
                                <DeleteIcon className="h-4 w-4" />
                              </span>
                            )}
                            {isBackorder && (
                              <span
                                onClick={() => {
                                  setIncludeBackorder(false);
                                  setBackorderQuantity(0);
                                  setValue("includeBackorder", false);
                                }}
                                className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                                title="Remove backorder"
                              >
                                <DeleteIcon className="h-4 w-4" />
                              </span>
                            )}
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
              disabled={
                displayRows.length === 0 || remainingQtyWithBackorder !== 0
              }
            >
              Save Allocation
              {remainingQtyWithBackorder !== 0 &&
                ` (${remainingQtyWithBackorder} remaining)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryStockSelectDialog;
