import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Mail } from "lucide-react";
import { ReceivedPurchaseWithRelations } from "@/types";
import { useReceivingPurchases } from "@/hooks/useReceivingPurchases";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { PDFViewer } from "@react-pdf/renderer";
import ReceivedInventoryPDF from "./ReceivedInventoryPDF";
import { useProducts } from "@/hooks/useProducts";
import { useCompanySettings } from "@/hooks/useCompanySettings";

interface Props {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase?: ReceivedPurchaseWithRelations;
}

const ReceivedPurchaseDialog = ({
  mode,
  open,
  onOpenChange,
  purchase,
}: Props) => {
  const { softDeleteReceivedPurchase, isSoftDeletingReceivedPurchase } =
    useReceivingPurchases();
  const { companySettings } = useCompanySettings();
  const { products } = useProducts({ getAllProducts: true });
  const { user } = useAuth();

  const router = useRouter();

  const handleDelete = async () => {
    try {
      if (purchase && purchase.purchase.id && user?.id) {
        await softDeleteReceivedPurchase(
          {
            id: purchase.receivedPurchase.id,
            userId: user.id,
          },
          {
            onSuccess: () => {
              toast.success("Receieved inventory deleted successfully.");
              onOpenChange(false);
            },
            onError: (error) => {
              console.error("Error deleting receieved inventory:", error);
              toast.error("Failed to delete receieved inventory.");
            },
          }
        );
      } else {
        throw new Error("Receieved inventory is required.");
      }
    } catch (error) {
      console.error("Error deleting receieved inventory:", error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      if (!purchase) {
        throw new Error("receieved purchase is required to generate PDF.");
      }
      const blob = await pdf(
        <ReceivedInventoryPDF
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
          allProducts={products}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `purchase_receipt_${
        purchase?.receivedPurchase.vendorParkingListNumber || Date.now()
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

      const subject = `Vendor Parking List Number: ${
        purchase?.receivedPurchase.vendorParkingListNumber || "N/A"
      }`;
      const body = `Dear ${
        purchase?.vendor.name || "Supplier"
      },\n\nPlease find attached the purchase receipt as requested.\n\nBest regards,\nYour Company \nSales Team`;

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
                Delete Received Inventory stock
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this receieved inventory? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Vendor Parking List Number:{" "}
                <span className="font-semibold">
                  {purchase?.receivedPurchase.vendorParkingListNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingReceivedPurchase}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSoftDeletingReceivedPurchase}
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
                {purchase && (
                  <ReceivedInventoryPDF
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
                    allProducts={products}
                  />
                )}
              </PDFViewer>
              <div className="flex justify-center gap-1.5 py-4 px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(
                      `/purchases/edit-received-inventory/${purchase?.receivedPurchase.id}`
                    );
                    onOpenChange(false);
                  }}
                  className="shad-primary-btn"
                >
                  <EditIcon className="h-5 w-5" />
                  Edit
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
                  onClick={() => {
                    handleEmail();
                    onOpenChange(false);
                  }}
                  className="shad-gray-btn"
                >
                  <Mail className="h-5 w-5" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="shad-danger-btn"
                >
                  <DeleteIcon className="h-5 w-5" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReceivedPurchaseDialog;
