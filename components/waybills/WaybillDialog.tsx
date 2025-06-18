import { useWaybills } from "@/hooks/useWaybills";
import { WaybillWithRelations } from "@/types";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import WaybillPDF from "./WaybillPDF";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Mail } from "lucide-react";
import { Download } from "lucide-react";
import { PDFViewer } from "@react-pdf/renderer";
import { FileText } from "lucide-react";

interface WaybillDialogProps {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waybill: WaybillWithRelations;
}

const WaybillDialog = ({
  mode,
  open,
  onOpenChange,
  waybill,
}: WaybillDialogProps) => {
  const { softDeleteWaybill, isSoftDeletingWaybill } = useWaybills();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      if (waybill && waybill.waybill.id) {
        await softDeleteWaybill(waybill.waybill.id, {
          onSuccess: () => {
            toast.success("Waybill deleted successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deleting waybill:", error);
            toast.error("Failed to delete waybill.");
          },
        });
      } else {
        throw new Error("Waybill is required.");
      }
    } catch (error) {
      console.error("Error deleting waybill:", error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<WaybillPDF waybill={waybill} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Waybill_${
        waybill.waybill.waybillRefNumber || Date.now()
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
      if (!waybill.customer.email) {
        toast.error("Customer email not found");
        return;
      }

      const subject = `Waybill Reference Number: ${
        waybill.waybill.waybillRefNumber || "N/A"
      }`;
      const body = `Dear ${
        waybill.customer.name || "Customer"
      },\n\nPlease find attached the waybill as requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        waybill.customer.email
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
                Delete Waybill
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this waybill? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Waybill Ref Number:{" "}
                <span className="font-semibold">
                  {waybill.waybill.waybillRefNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingWaybill}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSoftDeletingWaybill}
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
                {<WaybillPDF waybill={waybill} />}
              </PDFViewer>
              <div className="flex justify-center gap-1.5 py-4 px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(
                      `/promissory-notes/create-promissory-note/from-waybill/${waybill.waybill.id}`
                    );
                    onOpenChange(false);
                  }}
                  className="shad-gray-btn"
                >
                  <FileText className="h-5 w-5" />
                  Promissory Note
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(`/waybills/edit-waybill/${waybill.waybill.id}`);
                    onOpenChange(false);
                  }}
                  className="shad-primary-btn"
                >
                  <EditIcon className="h-5 w-5" />
                  Edit Waybill
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
                  Email Waybill
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="shad-danger-btn"
                >
                  <DeleteIcon className="h-5 w-5" />
                  Delete Waybill
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WaybillDialog;
