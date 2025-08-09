import { ReceivedPurchaseItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: ReceivedPurchaseItem;
}
const ViewReceivedLotNumbers = ({ open, onOpenChange, purchase }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full bg-light-200 space-y-4 p-8">
        <DialogHeader>
          <DialogTitle className="pb-2">
            Product: {purchase.productID} - {purchase.productName}
          </DialogTitle>
          <DialogDescription className="text-dark-600">
            Inventory Stock Batches ({purchase.inventoryStock.length})
          </DialogDescription>
        </DialogHeader>
        <div>
          <Table className="shad-table bg-white">
            <TableHeader>
              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                <TableHead>#</TableHead>
                <TableHead>Lot Number</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>MFG Date</TableHead>
                <TableHead>EXP Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.inventoryStock.map((batch, index) => {
                const isExpiringSoon =
                  batch.expiryDate &&
                  new Date(batch.expiryDate) <=
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                return (
                  <TableRow
                    key={`batch-${index}-${batch.lotNumber}`}
                    className={`w-full ${index % 2 === 1 ? "bg-blue-50" : ""}`}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{batch.lotNumber}</TableCell>
                    <TableCell>{batch.quantity}</TableCell>
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

export default ViewReceivedLotNumbers;
