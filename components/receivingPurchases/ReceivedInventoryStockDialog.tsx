import { ReceivedPurchaseWithRelations } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import FormatNumber from "../FormatNumber";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import ViewReceivedLotNumbers from "./ViewReceivedLotNumbers";
import { useState } from "react";
import { Eye } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: ReceivedPurchaseWithRelations;
}

const ReceivedInventoryStockDialog = ({
  open,
  onOpenChange,
  purchase,
}: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  if (purchase === null) {
    return null;
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100rem] w-full bg-light-200 space-y-4 p-8">
        <DialogHeader>
          <DialogTitle className="pb-2">
            Inventory Received against Purchase Order:{" "}
            {purchase.purchaseOrder.purchaseOrderNumber}
          </DialogTitle>
          <DialogDescription className="text-dark-600">
            Inventory stock Details
          </DialogDescription>
        </DialogHeader>
        <div>
          <Table className="shad-table bg-white">
            <TableHeader>
              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                <TableHead>#</TableHead>
                <TableHead>PID</TableHead>
                <TableHead>Product Description</TableHead>
                <TableHead>Qnty</TableHead>
                <TableHead className="!max-w-60">Lot Numbers</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {purchase.products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-4">
                    No products
                  </TableCell>
                </TableRow>
              )}
              {purchase.products.map((entry, index) => (
                <>
                  <TableRow
                    key={`${entry.productId}-${index}`}
                    className={`w-full cursor-pointer ${
                      index % 2 === 1 ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      setSelectedRowIndex(index);
                      setOpenDialog(true);
                    }}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{entry.productID}</TableCell>
                    <TableCell>{entry.productName}</TableCell>
                    <TableCell>
                      {entry.inventoryStock.reduce(
                        (total, stock) => total + stock.quantity,
                        0
                      )}
                    </TableCell>
                    <TableCell>{entry.inventoryStock.length}</TableCell>
                    <TableCell>
                      <FormatNumber value={entry.costPrice} />
                    </TableCell>
                    <TableCell>
                      <FormatNumber value={entry.sellingPrice} />
                    </TableCell>

                    <TableCell>
                      <FormatNumber value={entry.totalCost} />
                    </TableCell>
                    <TableCell>
                      <span
                        onClick={() => {
                          setSelectedRowIndex(index);
                          setOpenDialog(true);
                        }}
                        className="text-green-500 p-2 flex items-center gap-2 bg-light-200 rounded-md cursor-pointer"
                      >
                        <Eye className="h-5 w-5" />
                        <span>View Lots</span>
                      </span>
                    </TableCell>
                  </TableRow>
                  <ViewReceivedLotNumbers
                    open={openDialog && selectedRowIndex === index}
                    purchase={entry}
                    onOpenChange={setOpenDialog}
                  />
                </>
              ))}
              {/* Total amount row */}
              {purchase.products.length > 0 && (
                <>
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-right font-semibold text-blue-800 text-[17px] py-4"
                    >
                      {`Total Cost Price:`}
                    </TableCell>
                    <TableCell
                      colSpan={2}
                      className="font-semibold text-blue-800 text-[17px] py-4"
                    >
                      <FormatNumber
                        value={purchase.receivedPurchase.totalAmount}
                      />
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceivedInventoryStockDialog;
