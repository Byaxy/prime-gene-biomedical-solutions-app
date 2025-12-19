import { useState } from "react";
import { QuotationItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Eye } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import FormatNumber from "../FormatNumber";

const CustomerQuotationProductsDialog = ({
  products,
}: {
  products: QuotationItem[];
}) => {
  const [open, setOpen] = useState(false);
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size={"sm"}
          type="button"
          variant="outline"
          className="shad-gray-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Eye /> View products
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
          <DialogTitle>Pending Quotation Products</DialogTitle>
          <DialogDescription className="text-dark-600"></DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-8 mt-5">
          <Table className="shad-table">
            <TableHeader>
              <TableRow className="w-full bg-blue-800 text-white px-2 font-semibold">
                <TableHead>#</TableHead>
                <TableHead>PID</TableHead>
                <TableHead>Product Description</TableHead>
                <TableHead>Qnty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full bg-white text-blue-800">
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No products found for this quotation.
                  </TableCell>
                </TableRow>
              )}
              {products.map((product, index) => (
                <TableRow
                  key={`${product.id}-${index}`}
                  className={`w-full ${index % 2 === 1 ? "bg-blue-50" : ""}`}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{product.productID || "N/A"}</TableCell>
                  <TableCell>{product.productName || "N/A"}</TableCell>

                  <TableCell className="text-center">
                    {formatNumber(String(product.quantity)) || "N/A"}
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={product.unitPrice} />
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={product.taxAmount} />
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={product.discountAmount} />
                  </TableCell>
                  <TableCell>
                    <FormatNumber value={product.subTotal} />
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

export default CustomerQuotationProductsDialog;
