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
import { Mail, Download, ShoppingCart, Truck, Plus } from "lucide-react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { useRouter } from "next/navigation";
interface SaleDialogProps {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleWithRelations;
}

const SaleDialog = ({ mode, open, onOpenChange, sale }: SaleDialogProps) => {
  const { softDeleteSale, isSoftDeletingSale } = useSales();
  const { companySettings } = useCompanySettings();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      if (sale && sale.sale.id) {
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

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <SaleInvoice
          sale={sale}
          currencySymbol={companySettings?.currencySymbol || "$"}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice_${sale.sale.invoiceNumber || Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleEmailSale = async () => {
    try {
      if (!sale.customer.email) {
        toast.error("Customer email not found");
        return;
      }

      const subject = `Invoice Number: ${sale.sale.invoiceNumber}`;
      const body = `Dear ${
        sale.customer.name || "Customer"
      },\n\nPlease find attached the sale invoice as requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        sale.customer.email
      }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        body
      )}`;

      window.open(mailtoLink);

      toast.success(
        "Email client opened. Please attach the downloaded PDF manually."
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Error preparing email:", error);
      toast.error("Failed to prepare email");
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
          <DialogContent className="max-w-[100rem] w-full h-[96vh] p-0 bg-light-200">
            <DialogHeader className="hidden">
              <DialogTitle></DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <div className="flex flex-col w-full h-full bg-light-200">
              <PDFViewer className="w-full h-full">
                {
                  <SaleInvoice
                    sale={sale}
                    currencySymbol={companySettings?.currencySymbol || "$"}
                  />
                }
              </PDFViewer>
              <div className="flex justify-center gap-1.5 py-4 px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(`/sales/duplicate-invoice/${sale.sale.id}`);
                    onOpenChange(false);
                  }}
                  className="shad-gray-btn"
                >
                  <Plus className="h-5 w-5" />
                  Duplicate Sale
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(
                      `/promissory-notes/create-promissory-note/from-sale/${sale.sale.id}`
                    );
                    onOpenChange(false);
                  }}
                  className="shad-gray-btn"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Promissory Note
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(
                      `/deliveries/create-delivery/from-sale/${sale.sale.id}`
                    );
                    onOpenChange(false);
                  }}
                  className="shad-gray-btn"
                >
                  <Truck className="h-5 w-5" />
                  Add Delivery
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(`/sales/edit-invoice/${sale.sale.id}`);
                    onOpenChange(false);
                  }}
                  className="shad-primary-btn"
                >
                  <EditIcon className="h-5 w-5" />
                  Edit Sale
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleDownloadPDF();
                    onOpenChange(false);
                  }}
                  className="shad-gray-btn"
                >
                  <Download className="h-5 w-5" />
                  Download as PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleEmailSale()}
                  className="shad-gray-btn"
                >
                  <Mail className="h-5 w-5" />
                  Email Sale
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="shad-danger-btn"
                >
                  <DeleteIcon className="h-5 w-5" />
                  Delete Sale
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SaleDialog;
