import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useQuotations } from "@/hooks/useQuotations";
import QuotationDialog from "./QuotationsDialog";
import { useRouter } from "next/navigation";
import { QuotationWithRelations } from "@/types";
import { FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { EllipsisVertical } from "lucide-react";
import { Download } from "lucide-react";
import { Eye } from "lucide-react";
import toast from "react-hot-toast";
import { Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import QuotationPDF from "./QuotationPDF";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useProducts } from "@/hooks/useProducts";

const QuotationActions = ({
  quotation,
}: {
  quotation: QuotationWithRelations;
}) => {
  const [open, setOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "view">("add");

  const { companySettings } = useCompanySettings();
  const { products } = useProducts({ getAllProducts: true });

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const { softDeleteQuotation, isSoftDeletingQuotation } = useQuotations();

  const handleDelete = async () => {
    try {
      if (mode === "delete") {
        await softDeleteQuotation(quotation.quotation.id, {
          onSuccess: () => setOpen(false),
        });
      }
    } catch (error) {
      console.error("Error:", error);
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
      setOpen(false);
    } catch (error) {
      console.error("Error preparing email:", error);
      toast.error("Failed to prepare email");
    }
  };

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </PopoverTrigger>
        <PopoverContent className="w-72 flex flex-col mt-2 mr-12 gap-2 bg-white z-50">
          <p
            onClick={() => {
              setMode("view");
              setOpenDialog(true);
              setOpen(false);
            }}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="h-5 w-5" />
            <span>Quotation Details</span>
          </p>
          <p
            onClick={() => {
              router.push(
                `/sales/create-invoice/?sourceQuotation=${quotation.quotation.id}`
              );
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <FileText className="h-5 w-5" /> <span>Convert to Sale</span>
          </p>
          <p
            onClick={handleDownloadPDF}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Download className="h-5 w-5" /> <span>Download Quotation</span>
          </p>
          <p
            onClick={handleEmailQuotation}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Mail className="h-5 w-5" /> <span>Email Quotation</span>
          </p>
          <p
            onClick={() => {
              setMode("edit");
              router.push(
                `/quotations/edit-quotation/${quotation.quotation.id}`
              );
            }}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="h-5 w-5" /> <span>Edit Quotation</span>
          </p>
          <p
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" /> <span>Delete Quotation</span>
          </p>
          <p
            onClick={() => {
              handleDownloadRFQ();
              setOpen(false);
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Download className="h-5 w-5" /> <span>Download RFQ</span>
          </p>
        </PopoverContent>
      </Popover>

      <QuotationDialog
        mode={mode}
        open={openDialog}
        onOpenChange={setOpenDialog}
        quotation={quotation}
        onSubmit={handleDelete}
        isLoading={isSoftDeletingQuotation}
      />
    </div>
  );
};

export default QuotationActions;
