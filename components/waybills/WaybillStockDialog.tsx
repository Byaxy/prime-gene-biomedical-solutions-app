import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn, formatDateTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { InventoryStockWithRelations, WaybillInventoryStock } from "@/types";
import { useInventoryStock } from "@/hooks/useInventoryStock";
import Loading from "../../app/(dashboard)/loading";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

// Validation schema for waybill stock allocation
const WaybillStockAllocationValidation = z.object({
  waybillStock: z.array(
    z.object({
      inventoryStockId: z.string(),
      lotNumber: z.string(),
      quantityTaken: z.number().min(0, "Quantity cannot be negative"),
      unitPrice: z.number().min(0, "Unit price cannot be negative"),
    })
  ),
  searchQuery: z.string().optional(),
});

type WaybillStockAllocationFormValues = z.infer<
  typeof WaybillStockAllocationValidation
>;

interface WaybillStockDialogProps {
  stock: WaybillInventoryStock[];
  productID: string;
  qntyRequired: number;
  onSave: (updatedStock: WaybillInventoryStock[]) => void;
  availableInventory: InventoryStockWithRelations[];
  className?: string;
  isDisabled?: boolean;
}

const WaybillStockDialog = ({
  stock,
  productID,
  qntyRequired,
  onSave,
  availableInventory,
  className = "",
  isDisabled = false,
}: WaybillStockDialogProps) => {
  const [open, setOpen] = useState(false);
  const { inventoryStock, isLoading } = useInventoryStock({
    getAllInventoryStocks: true,
  });

  // Initialize React Hook Form
  const form = useForm<WaybillStockAllocationFormValues>({
    resolver: zodResolver(WaybillStockAllocationValidation),
    defaultValues: {
      waybillStock: [],
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
  const waybillStock = watch("waybillStock");
  const searchQuery = watch("searchQuery");

  // Memoize calculated values
  const totalAllocated = useMemo(
    () => waybillStock.reduce((sum, item) => sum + item.quantityTaken, 0),
    [waybillStock]
  );

  const remainingQuantity = useMemo(
    () => qntyRequired - totalAllocated,
    [qntyRequired, totalAllocated]
  );

  // Filter available stocks based on search query and exclude already selected
  const filteredAvailableStocks = useMemo(() => {
    const selectedStockIds = waybillStock?.map((item) => item.inventoryStockId);
    let filtered = availableInventory?.filter(
      (stock: InventoryStockWithRelations) =>
        !selectedStockIds.includes(stock.inventory.id)
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (stock: InventoryStockWithRelations) =>
          stock.inventory.lotNumber?.toLowerCase().includes(query) ||
          stock.product.name?.toLowerCase().includes(query) ||
          stock.product.productID?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [availableInventory, waybillStock, searchQuery]);

  // Check if a stock item needs replacement (referenced stock is unavailable)
  const getStockStatus = useCallback(
    (stockItem: WaybillInventoryStock) => {
      if (!inventoryStock) return { needsReplacement: false, availableQty: 0 };

      const referencedStock = inventoryStock.find(
        (stock: InventoryStockWithRelations) =>
          stock.inventory.id === stockItem.inventoryStockId
      );

      const availableQty = referencedStock?.inventory.quantity || 0;
      const needsReplacement = availableQty <= 0;

      return { needsReplacement, availableQty, referencedStock };
    },
    [inventoryStock]
  );

  // Initialize state when dialog opens
  useEffect(() => {
    if (open && stock.length > 0) {
      setValue("waybillStock", [...stock]);
    } else if (open) {
      reset({ waybillStock: [], searchQuery: "" });
    }
  }, [open, stock, setValue, reset]);

  const addStock = (stock: InventoryStockWithRelations) => {
    if (remainingQuantity <= 0) return;

    const currentStock = getValues("waybillStock");

    // Check if this stock is already selected
    const existingStockIndex = currentStock.findIndex(
      (item) => item.inventoryStockId === stock.inventory.id
    );

    if (existingStockIndex !== -1) {
      // Update existing stock quantity instead of adding duplicate
      const existingStock = currentStock[existingStockIndex];
      const maxAdditional = Math.min(
        stock.inventory.quantity - existingStock.quantityTaken,
        remainingQuantity
      );

      if (maxAdditional > 0) {
        const updatedStock = [...currentStock];
        const newQuantity = existingStock.quantityTaken + maxAdditional;

        updatedStock[existingStockIndex] = {
          ...existingStock,
          quantityTaken: newQuantity,
        };
        setValue("waybillStock", updatedStock);
      }
    } else {
      // Add new stock
      const maxTake = Math.min(stock.inventory.quantity, remainingQuantity);
      const unitPrice = 0; // Default unit price, user can update
      const newStockEntry = {
        inventoryStockId: stock.inventory.id,
        lotNumber: stock.inventory.lotNumber,
        quantityTaken: maxTake,
        unitPrice: unitPrice,
      };

      setValue("waybillStock", [...currentStock, newStockEntry]);
    }

    setValue("searchQuery", ""); // Clear search after selection
  };

  const updateStockQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 0) return;

    const currentStock = getValues("waybillStock");
    const stockItem = currentStock[index];
    if (!stockItem) return;

    const { availableQty } = getStockStatus(stockItem);
    let maxQuantity = newQuantity;

    // Don't exceed available quantity for valid stock
    if (availableQty > 0) {
      maxQuantity = Math.min(newQuantity, availableQty);
    }

    // Calculate what the new total would be
    const currentTotal = currentStock.reduce(
      (sum, item, i) => (i === index ? sum : sum + item.quantityTaken),
      0
    );
    const newTotal = currentTotal + maxQuantity;

    // Prevent over-allocation
    if (newTotal > qntyRequired) {
      maxQuantity = Math.max(0, qntyRequired - currentTotal);
    }

    const updatedStock = currentStock.map((item, i) =>
      i === index
        ? {
            ...item,
            quantityTaken: maxQuantity,
          }
        : item
    );

    setValue("waybillStock", updatedStock);
  };

  const replaceStock = (index: number, newInventoryStockId: string) => {
    const currentStock = getValues("waybillStock");
    const stockItem = currentStock[index];
    if (!stockItem) return;

    const newStock = availableInventory.find(
      (stock: InventoryStockWithRelations) =>
        stock.inventory.id === newInventoryStockId
    );

    if (!newStock) return;

    const updatedStock = currentStock.map((item, i) =>
      i === index
        ? {
            ...item,
            inventoryStockId: newInventoryStockId,
            lotNumber: newStock.inventory.lotNumber,
          }
        : item
    );

    setValue("waybillStock", updatedStock);
  };

  const removeStock = (index: number) => {
    const currentStock = getValues("waybillStock");
    const newStock = [...currentStock];
    newStock.splice(index, 1);
    setValue("waybillStock", newStock);
  };

  const handleSaveAllocation = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (totalAllocated !== qntyRequired) {
      if (totalAllocated < qntyRequired) {
        const shortage = qntyRequired - totalAllocated;
        toast.error(
          `Cannot save allocation. You need to allocate ${shortage} more items.`
        );
      } else {
        const excess = totalAllocated - qntyRequired;
        toast.error(
          `Cannot save allocation. You have over-allocated by ${excess} items. Please reduce the quantities.`
        );
      }
      return;
    }

    const currentStock = getValues("waybillStock");
    const validStock = currentStock.filter(
      (stock) => stock.quantityTaken > 0 && stock.inventoryStockId !== ""
    );

    if (validStock.length === 0) {
      alert("Please allocate stock before saving.");
      return;
    }

    onSave(validStock);
    setOpen(false);
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={isDisabled} className={className}>
          Confirm Stock
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-7xl bg-light-200"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onInteractOutside={(e) => {
          if (e.target instanceof Element) {
            if (
              e.target.closest('[role="listbox"]') ||
              e.target.closest("[data-radix-select-viewport]") ||
              e.target.closest("[data-radix-popper-content]")
            ) {
              e.preventDefault();
              return;
            }
          }

          const event = e.detail.originalEvent;
          if (event instanceof PointerEvent) {
            event.stopPropagation();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            Manage Stock Allocation for Product - {productID}
          </DialogTitle>
          <DialogDescription className="text-dark-600">
            Adjust stock allocation quantities and replace unavailable stock
            items. Total allocation must equal required quantity.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Loading />
        ) : (
          <div className="space-y-5">
            {/* Summary Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-14-medium">
                  Required Quantity: {qntyRequired}
                </h3>
                <p className="text-blue-800">
                  Available Stocks: {availableInventory.length}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={
                    remainingQuantity === 0
                      ? "text-green-500"
                      : remainingQuantity > 0
                      ? "text-orange-500"
                      : "text-red-500"
                  }
                >
                  Remaining quantity: {remainingQuantity}
                </span>
                {remainingQuantity < 0 && (
                  <div className="text-red-500 text-sm mt-1">
                    ⚠️ Over-allocation detected! Remove excess quantity.
                  </div>
                )}
              </div>
            </div>

            {/* Add Stock Section */}
            {remainingQuantity > 0 && filteredAvailableStocks.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-end">
                <div className="w-full sm:w-1/2">
                  <p className="text-14-medium my-2">
                    Add more stock to fulfill requirement
                  </p>
                  <Select disabled={remainingQuantity <= 0}>
                    <SelectTrigger className="shad-select-trigger">
                      <SelectValue
                        placeholder={
                          remainingQuantity <= 0
                            ? "Stock allocation complete"
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
                            placeholder="Search by Lot Number, Product Name"
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
                      {filteredAvailableStocks.length > 0 ? (
                        <>
                          <Table className="shad-table border border-light-200 rounded-lg bg-white">
                            <TableHeader>
                              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                                <TableHead>Lot Number</TableHead>
                                <TableHead>Available Qty</TableHead>
                                <TableHead>MFG Date</TableHead>
                                <TableHead>EXP Date</TableHead>
                                <TableHead>Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="w-full bg-white">
                              {filteredAvailableStocks.map(
                                (stock: InventoryStockWithRelations) => {
                                  const isExpiringSoon =
                                    stock.inventory.expiryDate &&
                                    new Date(stock.inventory.expiryDate) <=
                                      new Date(
                                        Date.now() + 30 * 24 * 60 * 60 * 1000
                                      );

                                  return (
                                    <TableRow
                                      key={stock.inventory.id}
                                      className="cursor-pointer hover:bg-blue-50"
                                    >
                                      <TableCell>
                                        {stock.inventory.lotNumber}
                                      </TableCell>
                                      <TableCell>
                                        {stock.inventory.quantity}
                                      </TableCell>
                                      <TableCell>
                                        {stock.inventory.manufactureDate
                                          ? formatDateTime(
                                              stock.inventory.manufactureDate
                                            ).dateOnly
                                          : "N/A"}
                                      </TableCell>
                                      <TableCell
                                        className={cn(
                                          "p-3",
                                          isExpiringSoon &&
                                            "text-orange-600 font-semibold"
                                        )}
                                      >
                                        {stock.inventory.expiryDate
                                          ? formatDateTime(
                                              stock.inventory.expiryDate
                                            ).dateOnly
                                          : "N/A"}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          size="sm"
                                          onClick={() => addStock(stock)}
                                          className="bg-blue-800 hover:bg-blue-800/90 text-white"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                              )}
                            </TableBody>
                          </Table>
                          {/* Hidden select options for form control */}
                          <div className="hidden">
                            {filteredAvailableStocks.map(
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
                              : "No additional inventory stock available"}
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Form validation errors */}
            {errors.waybillStock && (
              <div className="text-red-500 text-sm">
                {typeof errors.waybillStock.message === "string"
                  ? errors.waybillStock.message
                  : "Please check your stock allocation"}
              </div>
            )}

            {/* Stock Allocation Table */}
            <div className="w-full">
              <h4 className="font-medium mb-3">Stock Allocation:</h4>
              <Table className="shad-table border border-light-200 rounded-lg bg-white">
                <TableHeader>
                  <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                    <TableHead>#</TableHead>
                    <TableHead>Lot Number</TableHead>
                    <TableHead>Available Qty</TableHead>
                    <TableHead>Quantity to Take</TableHead>
                    <TableHead>MFG Date</TableHead>
                    <TableHead>EXP Date</TableHead>
                    <TableHead>Replace Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waybillStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        No stock allocated yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    waybillStock.map((stockItem, index) => {
                      const {
                        needsReplacement,
                        availableQty,
                        referencedStock,
                      } = getStockStatus(stockItem);

                      const isExpiringSoon =
                        referencedStock?.inventory.expiryDate &&
                        new Date(referencedStock.inventory.expiryDate) <=
                          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                      return (
                        <TableRow
                          key={`${stockItem.inventoryStockId}-${index}`}
                          className={cn(
                            "w-full",
                            index % 2 === 1 ? "bg-blue-50" : "",
                            needsReplacement ? "bg-red-50" : ""
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {index + 1}
                              {needsReplacement && (
                                <AlertTriangle
                                  className="h-4 w-4 text-red-500"
                                  title="Stock unavailable - needs replacement"
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{stockItem.lotNumber}</TableCell>
                          <TableCell>
                            <span
                              className={
                                needsReplacement
                                  ? "text-red-500 font-semibold"
                                  : ""
                              }
                            >
                              {availableQty}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={
                                needsReplacement ? qntyRequired : availableQty
                              }
                              value={stockItem.quantityTaken}
                              onChange={(e) =>
                                updateStockQuantity(
                                  index,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className={cn(
                                "w-20",
                                needsReplacement && "border-red-300"
                              )}
                              disabled={needsReplacement && availableQty === 0}
                            />
                          </TableCell>
                          <TableCell>
                            {referencedStock?.inventory.manufactureDate
                              ? formatDateTime(
                                  referencedStock.inventory.manufactureDate
                                ).dateOnly
                              : "N/A"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "p-3",
                              isExpiringSoon && "text-orange-600 font-semibold"
                            )}
                          >
                            {referencedStock?.inventory.expiryDate
                              ? formatDateTime(
                                  referencedStock.inventory.expiryDate
                                ).dateOnly
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {needsReplacement ? (
                              <Select
                                value=""
                                onValueChange={(value) =>
                                  replaceStock(index, value)
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Select stock" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  {availableInventory.map(
                                    (stock: InventoryStockWithRelations) => (
                                      <SelectItem
                                        key={stock.inventory.id}
                                        value={stock.inventory.id}
                                      >
                                        {stock.inventory.lotNumber} (
                                        {stock.inventory.quantity} available)
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-green-500 text-sm">
                                ✓ Available
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              onClick={() => removeStock(index)}
                              className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
                              title="Remove stock allocation"
                            >
                              <DeleteIcon className="h-4 w-4" />
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Action Buttons */}
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
                  waybillStock.length === 0 ||
                  remainingQuantity !== 0 ||
                  waybillStock.some(
                    (stockItem) => getStockStatus(stockItem).needsReplacement
                  )
                }
              >
                Save Allocation
                {remainingQuantity !== 0 && ` (${remainingQuantity} remaining)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WaybillStockDialog;
