import { SaleWithRelations, WaybillWithRelations } from "@/types";
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
import { formatDateTime, formatNumber } from "@/lib/utils";
import LoanWaybillProductsDialog from "./LoanWaybillProductsDialog";
import { useRouter } from "next/navigation";

interface LoanWaybillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waybills: WaybillWithRelations[];
  sale: SaleWithRelations;
}
const LoanWaybillsDialog = ({
  open,
  onOpenChange,
  waybills,
  sale,
}: LoanWaybillsDialogProps) => {
  const router = useRouter();

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-7xl bg-light-200"
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
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl text-blue-800">
            {`Matching Loan Waybills for ${sale.customer.name} on sale with invoice number ${sale.sale.invoiceNumber}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">{`Below are the matching loan waybills for ${sale.customer.name} on sale with invoice number ${sale.sale.invoiceNumber}`}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-5">
          <Table className="shad-table">
            <TableHeader>
              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Waybill Ref No.</TableHead>
                <TableHead>Total Qnty Supplied</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {waybills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No loan waybills found for this sale.
                  </TableCell>
                </TableRow>
              )}
              {waybills.map((waybill, index) => {
                const qntySupplied = waybill.products.reduce(
                  (total, product) => total + product.quantitySupplied,
                  0
                );

                return (
                  <TableRow
                    key={`${waybill.waybill.id}-${index}`}
                    className={`w-full ${index % 2 === 1 ? "bg-blue-50" : ""}`}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {formatDateTime(waybill.waybill.waybillDate).dateTime}
                    </TableCell>
                    <TableCell>{waybill.waybill.waybillRefNumber}</TableCell>

                    <TableCell>{formatNumber(String(qntySupplied))}</TableCell>
                    <TableCell className="flex items-center justify-center gap-2">
                      <LoanWaybillProductsDialog
                        products={waybill.products.filter(
                          (product) =>
                            product.quantityConverted < product.quantitySupplied
                        )}
                        waybillType={waybill.waybill.waybillType}
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
                            `/waybills/convert-loan-waybill?waybillId=${waybill.waybill.id}&saleId=${sale.sale.id}`
                          );
                          onOpenChange(false);
                        }}
                      >
                        Convert to Sale Waybill
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

export default LoanWaybillsDialog;
