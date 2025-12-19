import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import toast from "react-hot-toast";
import { PDFViewer } from "@react-pdf/renderer";
import { useRouter } from "next/navigation";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Download } from "lucide-react";
import { Mail } from "lucide-react";
import { PromissoryNoteWithRelations } from "@/types";
import PromissoryNotePDF from "./PromissoryNotePDF";
import { usePromissoryNote } from "@/hooks/usePromissoryNote";
import { useCompanySettings } from "@/hooks/useCompanySettings";

interface PromissoryNoteDialogProps {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promissoryNote: PromissoryNoteWithRelations;
}

const PromissoryNoteDialog = ({
  mode,
  open,
  onOpenChange,
  promissoryNote,
}: PromissoryNoteDialogProps) => {
  const { softDeletePromissoryNote, isSoftDeletingPromissoryNote } =
    usePromissoryNote();
  const { companySettings } = useCompanySettings();

  const router = useRouter();

  const handleDelete = async () => {
    try {
      if (promissoryNote && promissoryNote.promissoryNote.id) {
        await softDeletePromissoryNote(promissoryNote.promissoryNote.id, {
          onSuccess: () => {
            toast.success("Promissory Note deleted successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deleting Promissory Note:", error);
            toast.error("Failed to delete Promissory Note.");
          },
        });
      } else {
        throw new Error("Promissory Note is required.");
      }
    } catch (error) {
      console.error("Error deleting Promissory Note:", error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <PromissoryNotePDF
          promissoryNote={promissoryNote}
          currency={companySettings?.currencySymbol ?? "$"}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PromissoryNote_${
        promissoryNote.promissoryNote.promissoryNoteRefNumber || Date.now()
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
      if (!promissoryNote.customer.email) {
        toast.error("Customer email not found");
        return;
      }

      const subject = `Promissory Note Reference Number: ${
        promissoryNote.promissoryNote.promissoryNoteRefNumber || "N/A"
      }`;
      const body = `Dear ${
        promissoryNote.customer.name || "Customer"
      },\n\nPlease find attached the promissory note as requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        promissoryNote.customer.email
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
                Delete Promissory Note
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this promissory note? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Promissory Note Ref Number:{" "}
                <span className="font-semibold">
                  {promissoryNote.promissoryNote.promissoryNoteRefNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingPromissoryNote}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSoftDeletingPromissoryNote}
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
                {
                  <PromissoryNotePDF
                    promissoryNote={promissoryNote}
                    currency={companySettings?.currencySymbol ?? "$"}
                  />
                }
              </PDFViewer>
              <div className="flex justify-center gap-1.5 py-4 px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(
                      `/promissory-notes/edit-promissory-note/${promissoryNote.promissoryNote.id}`
                    );
                    onOpenChange(false);
                  }}
                  className="shad-primary-btn"
                >
                  <EditIcon className="h-5 w-5" />
                  Edit Promissory Note
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
                  Email Promissory Note Note
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="shad-danger-btn"
                >
                  <DeleteIcon className="h-5 w-5" />
                  Delete Promissory Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PromissoryNoteDialog;
