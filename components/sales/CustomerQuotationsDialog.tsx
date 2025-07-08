import { Customer, QuotationWithRelations } from "@/types";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import FormatNumber from "../FormatNumber";
import CustomerQuotationProductsDialog from "./CustomerQuotationProductsDialog";

interface CustomerQuotationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotations: QuotationWithRelations[];
  customer: Customer;
}

const CustomerQuotationsDialog = ({
  open,
  onOpenChange,
  quotations,
  customer,
}: CustomerQuotationsDialogProps) => {
  const router = useRouter();

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl bg-light-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl text-blue-800">
            {`Pending Quotations for ${customer?.name}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">{`Below are the pending quotations for ${customer?.name}`}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-5">
          <Table className="shad-table">
            <TableHeader>
              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Quotation No.</TableHead>
                <TableHead>Total Qnty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Converted To Sale</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {quotations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No pending quotations found for this customer.
                  </TableCell>
                </TableRow>
              )}
              {quotations.map((quotation, index) => {
                const totalQnty = quotation.products.reduce(
                  (total, product) => total + product.quantity,
                  0
                );

                return (
                  <TableRow
                    key={`${quotation.quotation.id}-${index}`}
                    className={`w-full ${index % 2 === 1 ? "bg-blue-50" : ""}`}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {
                        formatDateTime(quotation.quotation.quotationDate)
                          .dateTime
                      }
                    </TableCell>
                    <TableCell>{quotation.quotation.quotationNumber}</TableCell>

                    <TableCell>{formatNumber(String(totalQnty))}</TableCell>
                    <TableCell>
                      <FormatNumber value={quotation.quotation.totalAmount} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-14-medium capitalize",
                          quotation.quotation.status === "pending" &&
                            "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
                          quotation.quotation.status === "completed" &&
                            "bg-green-500 text-white px-3 py-1 rounded-xl",
                          quotation.quotation.status === "cancelled" &&
                            "bg-red-600 text-white px-3 py-1 rounded-xl"
                        )}
                      >
                        {quotation.quotation.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-14-medium",
                          quotation.quotation.convertedToSale &&
                            "bg-green-500 text-white px-3 py-1 rounded-xl",
                          !quotation.quotation.convertedToSale &&
                            "bg-red-600 text-white px-3 py-1 rounded-xl"
                        )}
                      >
                        {quotation.quotation.convertedToSale ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="flex items-center justify-center gap-2">
                      <CustomerQuotationProductsDialog
                        products={quotation.products}
                      />
                      <Button
                        size={"sm"}
                        variant="outline"
                        type="button"
                        className="shad-primary-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(
                            `/sales/create-invoice/from-quotation/${quotation.quotation.id}`
                          );
                          onOpenChange(false);
                        }}
                      >
                        Convert to Sale
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              className="shad-danger-btn"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerQuotationsDialog;
