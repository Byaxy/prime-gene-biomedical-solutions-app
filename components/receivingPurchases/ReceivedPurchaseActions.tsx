import DeleteIcon from "@mui/icons-material/Delete";
import { EllipsisVertical } from "lucide-react";
import { Eye } from "lucide-react";
import { Mail } from "lucide-react";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";
import { ReceivedPurchaseWithRelations } from "@/types";
import ReceivedPurchaseDialog from "./ReceivedPurchaseDialog";
import toast from "react-hot-toast";
import ReceivedInventoryPDF from "./ReceivedInventoryPDF";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useProducts } from "@/hooks/useProducts";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ReceivedInventoryStockDialog from "./ReceivedInventoryStockDialog";

const ReceivedPurchaseActions = ({
  purchase,
}: {
  purchase: ReceivedPurchaseWithRelations;
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [openStockDialog, setOpenStockDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "view">("add");

  const { companySettings } = useCompanySettings();
  const { products } = useProducts({ getAllProducts: true });
  const supabase = createSupabaseBrowserClient();

  // handle close dialog
  const closeDialog = () => {
    setOpenDialog(false);
    setOpenStockDialog(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

  const handleDownloadRFQ = async () => {
    try {
      if (
        !purchase.receivedPurchase.attachments ||
        purchase.receivedPurchase.attachments.length === 0
      ) {
        toast.error("No attachments found");
        return;
      }

      // Download attachments
      await Promise.all(
        purchase.receivedPurchase.attachments.map(async (attachment) => {
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
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 bg-white py-4 px-2" align="end">
          <DropdownMenuItem
            onClick={() => {
              setMode("view");
              setOpenDialog(true);
            }}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="h-5 w-5" />
            <span>View Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleDownloadPDF}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Download className="h-5 w-5" />
            <span>Download as PDF</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleEmail}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Mail className="h-5 w-5" />
            <span>Email</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleDownloadRFQ}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Download className="h-5 w-5" />
            <span>Download Attachments</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setMode("view");
              setOpenStockDialog(true);
            }}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="h-5 w-5" />
            <span>View Stock Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReceivedPurchaseDialog
        mode={mode}
        open={openDialog}
        onOpenChange={closeDialog}
        purchase={purchase}
      />
      <ReceivedInventoryStockDialog
        open={openStockDialog}
        onOpenChange={closeDialog}
        purchase={purchase}
      />
    </div>
  );
};

export default ReceivedPurchaseActions;
