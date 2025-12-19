import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PurchaseWithRelations } from "@/types";
import { usePurchases } from "@/hooks/usePurchases";
import toast from "react-hot-toast";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { PDFViewer } from "@react-pdf/renderer";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Mail } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import PurchasePDF from "./PurchasePDF";

interface PurchaseDialogProps {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase?: PurchaseWithRelations;
}

export function PurchaseDialog({
  mode,
  open,
  onOpenChange,
  purchase,
}: PurchaseDialogProps) {
  const { softDeletePurchase, isSoftDeletingPurchase } = usePurchases();
  const { companySettings } = useCompanySettings();

  const router = useRouter();

  const handleDelete = async () => {
    try {
      if (purchase && purchase.purchase.id) {
        await softDeletePurchase(purchase.purchase.id, {
          onSuccess: () => {
            toast.success("Purchase order deleted successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deleting purchase:", error);
            toast.error("Failed to delete purchase.");
          },
        });
      } else {
        throw new Error("Purchase is required.");
      }
    } catch (error) {
      console.error("Error deleting purchase:", error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      if (!purchase) {
        throw new Error("Purchase is required to generate PDF.");
      }
      const blob = await pdf(
        <PurchasePDF
          purchase={purchase}
          companySettings={{
            name: companySettings?.name ?? "",
            email: companySettings?.email ?? "",
            phone: companySettings?.phone ?? "",
            address: companySettings?.address ?? "",
            city: companySettings?.city ?? "",
            state: companySettings?.state ?? "",
            country: companySettings?.country ?? "",
            currencySymbol: companySettings?.currencySymbol ?? "$",
          }}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `purchase_${
        purchase?.purchase.purchaseNumber || Date.now()
      }.pdf`;
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

  const handleEmail = async () => {
    try {
      if (!purchase?.vendor.email) {
        toast.error("Vendor email not found");
        return;
      }

      const subject = `Purchase Number: ${
        purchase?.purchase.purchaseNumber || "N/A"
      }`;
      const body = `Dear ${
        purchase?.vendor.name || "Supplier"
      },\n\nPlease find attached the purchase order as requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        purchase?.vendor.email
      }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        body
      )}`;

      window.open(mailtoLink);

      toast.success(
        "Email client opened. Please attach the downloaded PDF manually."
      );
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
                Delete Purchase
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this purchase? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Purchase:{" "}
                <span className="font-semibold">
                  {purchase?.purchase.purchaseNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingPurchase}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSoftDeletingPurchase}
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
          <DialogContent
            className="max-w-[100rem] w-full h-[96vh] p-0 bg-light-200"
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
            <DialogHeader className="hidden">
              <DialogTitle></DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <div className="flex flex-col w-full h-full bg-light-200">
              <PDFViewer className="w-full h-full">
                {purchase && (
                  <PurchasePDF
                    purchase={purchase}
                    companySettings={{
                      name: companySettings?.name ?? "",
                      email: companySettings?.email ?? "",
                      phone: companySettings?.phone ?? "",
                      address: companySettings?.address ?? "",
                      city: companySettings?.city ?? "",
                      state: companySettings?.state ?? "",
                      country: companySettings?.country ?? "",
                      currencySymbol: companySettings?.currencySymbol ?? "$",
                    }}
                  />
                )}
              </PDFViewer>
              <div className="flex justify-center gap-1.5 py-4 px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(
                      `/purchases/edit-purchase/${purchase?.purchase.id}`
                    );
                    onOpenChange(false);
                  }}
                  className="shad-primary-btn"
                >
                  <EditIcon className="h-5 w-5" />
                  Edit Purchase
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
                  onClick={() => handleEmail()}
                  className="shad-gray-btn"
                >
                  <Mail className="h-5 w-5" />
                  Email Purchase
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="shad-danger-btn"
                >
                  <DeleteIcon className="h-5 w-5" />
                  Delete Purchase
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
