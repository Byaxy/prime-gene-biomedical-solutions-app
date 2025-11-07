"use client";

import { useCallback, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/navigation";
import { ReceiptWithRelations } from "@/types";
import { EllipsisVertical } from "lucide-react";
import { Eye, Download, Mail } from "lucide-react";
import toast from "react-hot-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import ReceiptDialog from "./ReceiptDialog";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import ReceiptPDF from "./ReceiptPDF";

const ReceiptActions = ({ receipt }: { receipt: ReceiptWithRelations }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"view" | "delete">("view");

  const { companySettings } = useCompanySettings();
  const router = useRouter();

  const handleEdit = () => {
    router.push(
      `/accounting-and-finance/income/receipts/edit/${receipt.receipt.id}`
    );
  };

  const handleView = () => {
    setMode("view");
    setOpenDialog(true);
  };

  const handleDeleteClick = () => {
    setMode("delete");
    setOpenDialog(true);
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <ReceiptPDF
          receipt={receipt}
          currencySymbol={companySettings?.currencySymbol || "$"}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Receipt_${
        receipt.receipt.receiptNumber || Date.now()
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

  const handleEmailReceipt = async () => {
    try {
      if (!receipt.customer?.email) {
        toast.error("Customer email not found");
        return;
      }

      const subject = `Receipt Number: ${receipt.receipt.receiptNumber}`;
      const body = `Dear ${
        receipt.customer?.name || "Customer"
      },\n\nPlease find attached your payment receipt as requested.\n\nBest regards,\nYour Company \nAccounting Team`;

      // First, download the PDF (optional, you might want to generate a separate PDF for email)
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        receipt.customer.email
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

  // handle close dialog
  const closeDialog = useCallback(() => {
    setOpenDialog(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  }, []);

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 bg-white py-4 px-2" align="end">
          <DropdownMenuItem
            onClick={handleView}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleEdit}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="mr-2 h-4 w-4" /> Edit Receipt
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDownloadPDF}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" /> Download as PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleEmailReceipt}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Mail className="mr-2 h-4 w-4" /> Email Receipt
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="mr-2 h-4 w-4" /> Delete Receipt
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReceiptDialog
        mode={mode}
        open={openDialog}
        onOpenChange={closeDialog}
        receipt={receipt}
      />
    </div>
  );
};

export default ReceiptActions;
