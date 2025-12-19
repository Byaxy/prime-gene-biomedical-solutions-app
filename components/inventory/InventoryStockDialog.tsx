import { GroupedInventoryStock } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import FormatNumber from "../FormatNumber";
import { cn, formatDateTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface InventoryStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: GroupedInventoryStock;
}
const InventoryStockDialog = ({
  open,
  onOpenChange,
  stock,
}: InventoryStockDialogProps) => {
  if (stock === null) {
    return null;
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl w-full bg-light-200 space-y-4 p-8"
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
          <DialogTitle className="pb-2">
            Product ID: {stock.product.productID} - Stock Batches (
            {stock.stockBatches.length})
          </DialogTitle>
          <DialogDescription className="text-dark-600">
            Inventory stock Details for {stock.product.productID} -{" "}
            {stock.product.name}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Table className="shad-table bg-white">
            <TableHeader>
              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                <TableHead>#</TableHead>
                <TableHead>Lot Number</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>MFG Date</TableHead>
                <TableHead>EXP Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.stockBatches.map((batch, index) => {
                const isExpiringSoon =
                  batch.expiryDate &&
                  new Date(batch.expiryDate) <=
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                return (
                  <TableRow
                    key={batch.id}
                    className={`w-full ${index % 2 === 1 ? "bg-blue-50" : ""}`}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{batch.lotNumber}</TableCell>
                    <TableCell>
                      {formatDateTime(batch.receivedDate).dateOnly}
                    </TableCell>
                    <TableCell>{batch.quantity}</TableCell>
                    <TableCell>
                      <FormatNumber value={batch.costPrice} />
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={batch.sellingPrice} />
                    </TableCell>
                    <TableCell>
                      {batch.manufactureDate
                        ? formatDateTime(batch.manufactureDate).dateOnly
                        : "N/A"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "p-3",
                        isExpiringSoon && "text-orange-600 font-semibold"
                      )}
                    >
                      {batch.expiryDate
                        ? formatDateTime(batch.expiryDate).dateOnly
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryStockDialog;
