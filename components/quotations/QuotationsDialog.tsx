import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { QuotationWithRelations } from "@/types";
import { PDFViewer } from "@react-pdf/renderer";
import QuotationPDF from "./QuotationPDF";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useProducts } from "@/hooks/useProducts";
import { useQuotations } from "@/hooks/useQuotations";
import toast from "react-hot-toast";
import { Mail, Download, FileText } from "lucide-react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
interface QuotationDialogProps {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: QuotationWithRelations;
}

const QuotationDialog = ({
  mode,
  open,
  onOpenChange,
  quotation,
}: QuotationDialogProps) => {
  const { companySettings } = useCompanySettings();
  const { products } = useProducts({ getAllProducts: true });
  const { softDeleteQuotation, isSoftDeletingQuotation } = useQuotations();

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleDelete = async () => {
    try {
      if (quotation && quotation.quotation.id) {
        await softDeleteQuotation(quotation.quotation.id, {
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

  const handleDownloadRFQ = async () => {
    try {
      if (
        !quotation.quotation.attachments ||
        quotation.quotation.attachments.length === 0
      ) {
        toast.error("No attachments found for this quotation");
        return;
      }

      // Download attachments
      await Promise.all(
        quotation.quotation.attachments.map(async (attachment) => {
          try {
            // Get the file extension from the original filename
            const fileExtension = attachment.name.split(".").pop();

            const { data, error } = await supabase.storage
              .from("images")
              .download(attachment.id);

            if (error) throw error;
            if (!data) throw new Error("No data received");

            const url = window.URL.createObjectURL(data);
            const link = document.createElement("a");
            link.href = url;

            // Preserve the original filename and extension
            link.download =
              attachment.name ||
              `attachment_${Date.now()}.${fileExtension || ""}`;

            document.body.appendChild(link);
            link.click();

            // Clean up
            setTimeout(() => {
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }, 100);

            toast.success(`Downloading ${attachment.name}`);
          } catch (error) {
            console.error(`Error downloading ${attachment.name}:`, error);
            toast.error(`Failed to download ${attachment.name}`);
          }
        })
      );
    } catch (error) {
      console.error("Error downloading attachments:", error);
      toast.error("Failed to download attachments");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <QuotationPDF
          quotation={quotation}
          currencySymbol={companySettings?.currencySymbol || "$"}
          allProducts={products || []}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Quotation_${
        quotation.quotation.quotationNumber || Date.now()
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

  const handleEmailQuotation = async () => {
    try {
      if (!quotation.customer.email) {
        toast.error("Customer email not found");
        return;
      }

      const subject = `Quotation ${quotation.quotation.quotationNumber}`;
      const body = `Dear ${
        quotation.customer.name || "Customer"
      },\n\nPlease find attached the quotation you requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        quotation.customer.email
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
                Delete Quotation
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this quotation? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Quotation Number:{" "}
                <span className="font-semibold">
                  {quotation.quotation?.quotationNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingQuotation}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSoftDeletingQuotation}
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
                  <QuotationPDF
                    quotation={quotation}
                    currencySymbol={companySettings?.currencySymbol || "$"}
                    allProducts={products || []}
                  />
                }
              </PDFViewer>
              <div className="flex justify-center gap-1.5 py-4 px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (quotation.quotation.convertedToSale) {
                      toast.success(
                        "This quotation has already been converted to a sale."
                      );
                      onOpenChange(false);
                      return;
                    } else {
                      router.push(
                        `/sales/create-invoice/from-quotation/${quotation.quotation.id}`
                      );
                      onOpenChange(false);
                    }
                  }}
                  className="shad-gray-btn"
                >
                  <FileText className="h-5 w-5" />
                  Convert to Sale
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(
                      `/quotations/edit-quotation/${quotation.quotation.id}`
                    );
                    onOpenChange(false);
                  }}
                  className="shad-primary-btn"
                >
                  <EditIcon className="h-5 w-5" />
                  Edit Quotation
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
                  Download Quotation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleEmailQuotation();
                    onOpenChange(false);
                  }}
                  className="shad-gray-btn"
                >
                  <Mail className="h-5 w-5" />
                  Email Quotation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleDownloadRFQ();
                    onOpenChange(false);
                  }}
                  className="shad-gray-btn"
                >
                  <Download className="h-5 w-5" />
                  Download RFQ
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

export default QuotationDialog;
