import { DeliveryWithRelations } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useDeliveries } from "@/hooks/useDeliveries";
import toast from "react-hot-toast";
import { PDFViewer } from "@react-pdf/renderer";
import DeliveryNote from "./DeliveryNote";
import { useRouter } from "next/navigation";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Download } from "lucide-react";
import { Mail } from "lucide-react";

interface DeliveryDialogProps {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryWithRelations;
}

const DeliveryDialog = ({
  mode,
  open,
  onOpenChange,
  delivery,
}: DeliveryDialogProps) => {
  const { softDeleteDelivery, isSoftDeletingDelivery } = useDeliveries();

  const router = useRouter();

  const handleDelete = async () => {
    try {
      if (delivery && delivery.delivery.id) {
        await softDeleteDelivery(delivery.delivery.id, {
          onSuccess: () => {
            toast.success("Delivery deleted successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deleting delivery:", error);
            toast.error("Failed to delete delivery.");
          },
        });
      } else {
        throw new Error("Delivery is required.");
      }
    } catch (error) {
      console.error("Error deleting delivery:", error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<DeliveryNote delivery={delivery} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Delivery_${
        delivery.delivery.deliveryRefNumber || Date.now()
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

  const handleEmailDelivery = async () => {
    try {
      if (!delivery.customer.email) {
        toast.error("Customer email not found");
        return;
      }

      const subject = `Delivery Reference Number: ${
        delivery.delivery.deliveryRefNumber || "N/A"
      }`;
      const body = `Dear ${
        delivery.customer.name || "Customer"
      },\n\nPlease find attached the delivery note as requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        delivery.customer.email
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
                Delete Delivery
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this delivery? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Delivery Ref Number:{" "}
                <span className="font-semibold">
                  {delivery.delivery.deliveryRefNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingDelivery}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSoftDeletingDelivery}
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
                {<DeliveryNote delivery={delivery} />}
              </PDFViewer>
              <div className="flex justify-center gap-1.5 py-4 px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(
                      `/deliveries/edit-delivery/${delivery.delivery.id}`
                    );
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
                  onClick={() => handleEmailDelivery()}
                  className="shad-gray-btn"
                >
                  <Mail className="h-5 w-5" />
                  Email Delivery Note
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="shad-danger-btn"
                >
                  <DeleteIcon className="h-5 w-5" />
                  Delete Delivery
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DeliveryDialog;
