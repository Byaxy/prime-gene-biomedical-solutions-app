"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "../ui/table";
import { PurchaseOrderWithRelations } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrders: PurchaseOrderWithRelations[];
}
const PendingPurchaseOrdersDialog = ({
  open,
  onOpenChange,
  purchaseOrders,
}: Props) => {
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95rem] bg-light-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl text-blue-800">
            Pending Purchase Orders
          </DialogTitle>
          <DialogDescription className="text-dark-500"></DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <Table className="shad-table">
            <TableHeader>
              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Purchase Order Number</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Converted To Purchase?</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {purchaseOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-4">
                    No products added
                  </TableCell>
                </TableRow>
              )}
              {purchaseOrders.map((entry, index) => (
                <TableRow
                  key={`${entry.purchaseOrder.id}-${index}`}
                  className="w-full hover:bg-blue-50"
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {
                      formatDateTime(entry.purchaseOrder.purchaseOrderDate)
                        .dateTime
                    }
                  </TableCell>
                  <TableCell>
                    {entry.purchaseOrder.purchaseOrderNumber}
                  </TableCell>

                  <TableCell>
                    {entry.products.reduce(
                      (total, product) => total + product.quantity,
                      0
                    ) || "-"}
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={entry.purchaseOrder.totalAmount} />
                  </TableCell>
                  <TableCell>{entry.vendor.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-14-medium capitalize",
                        entry.purchaseOrder.isConvertedToPurchase &&
                          "bg-green-500 text-white px-3 py-1 rounded-xl",
                        !entry.purchaseOrder.isConvertedToPurchase &&
                          "bg-red-600 text-white px-3 py-1 rounded-xl"
                      )}
                    >
                      {entry.purchaseOrder.isConvertedToPurchase ? "Yes" : "No"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-row items-center">
                      <span
                        onClick={() => {
                          router.push(
                            `/purchases/create-purchase/from-purchase-order/${entry.purchaseOrder.id}`
                          );
                          onOpenChange(false);
                        }}
                        className="bg-green-500 text-white p-2 flex items-center gap-2 rounded-md cursor-pointer"
                      >
                        Convert To Purchase
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PendingPurchaseOrdersDialog;
