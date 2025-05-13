import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { SaleWithRelations } from "@/types";
import { useSales } from "@/hooks/useSales";
import toast from "react-hot-toast";
import { PDFViewer } from "@react-pdf/renderer";
import SaleInvoice from "./SaleInvoice";
import { useCompanySettings } from "@/hooks/useCompanySettings";
interface SaleDialogProps {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithRelations;
}

const SaleDialog = ({ mode, open, onOpenChange, sale }: SaleDialogProps) => {
  const { softDeleteSale, isSoftDeletingSale } = useSales();
  const { companySettings } = useCompanySettings();

  const handleDelete = async () => {
    try {
      if (mode === "delete" && sale.sale.id) {
        await softDeleteSale(sale.sale.id, {
          onSuccess: () => {
            toast.success("Sale deleted successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deleting sale:", error);
            toast.error("Failed to delete sale.");
          },
        });
      } else {
        throw new Error("Sale is required.");
      }
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };

  return (
    <div>
      {mode === "delete" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-2xl bg-light-200">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl text-blue-800">
                Delete Sale
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this sale? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Sale Invoice Number:{" "}
                <span className="font-semibold">
                  {sale?.sale.invoiceNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingSale}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSoftDeletingSale}
                  className="shad-danger-btn"
                >
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {mode === "view" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-[100rem] w-full h-[90vh] p-0 bg-light-200">
            <DialogHeader className="hidden">
              <DialogTitle></DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <PDFViewer className="w-full h-full">
              {
                <SaleInvoice
                  sale={sale}
                  currencySymbol={companySettings?.currencySymbol || "$"}
                />
              }
            </PDFViewer>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SaleDialog;
