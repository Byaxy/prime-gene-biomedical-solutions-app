"use client";

import { PurchaseOrderWithRelations } from "@/types";
import toast from "react-hot-toast";
import PurchaseOrderPDF from "./PurchaseOrderPDF";
import { useRouter } from "next/navigation";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useProducts } from "@/hooks/useProducts";
import { useState } from "react";
import PurchaseOrderDialog from "./PurchaseOrderDialog";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { EllipsisVertical } from "lucide-react";
import { Eye } from "lucide-react";
import { Mail } from "lucide-react";
import { File } from "lucide-react";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const PurchaseOrderActions = ({
  purchaseOrder,
}: {
  purchaseOrder: PurchaseOrderWithRelations;
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "view">("add");

  const { companySettings } = useCompanySettings();
  const { products } = useProducts({ getAllProducts: true });

  const router = useRouter();

  // handle close dialog
  const closeDialog = () => {
    setOpenDialog(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      if (!purchaseOrder) {
        throw new Error("Purchase order is required to generate PDF.");
      }
      const blob = await pdf(
        <PurchaseOrderPDF
          purchaseOrder={purchaseOrder}
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
      link.download = `purchase_order_${
        purchaseOrder?.purchaseOrder.purchaseOrderNumber || Date.now()
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
      if (!purchaseOrder?.vendor.email) {
        toast.error("Vendor email not found");
        return;
      }

      const subject = `Purchase Order Number: ${
        purchaseOrder?.purchaseOrder.purchaseOrderNumber || "N/A"
      }`;
      const body = `Dear ${
        purchaseOrder?.vendor.name || "Supplier"
      },\n\nPlease find attached the purchase order as requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        purchaseOrder?.vendor.email
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
        <DropdownMenuContent className="w-72 bg-white py-4 px-2" align="end">
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

          {!purchaseOrder.purchaseOrder.isConvertedToPurchase && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setMode("edit");
                  router.push(
                    `/purchases/edit-purchase-order/${purchaseOrder?.purchaseOrder.id}`
                  );
                }}
                className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              >
                <EditIcon className="h-5 w-5" />
                <span>Edit Purchase Order</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMode("edit");
                  router.push(
                    `/purchases/create-purchase/from-purchase-order/${purchaseOrder?.purchaseOrder.id}`
                  );
                }}
                className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              >
                <File className="h-5 w-5" />
                <span>Convert To Purchase</span>
              </DropdownMenuItem>
            </>
          )}

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
            <span>Email Purchase Order</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" />
            <span>Delete Purchase Order</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PurchaseOrderDialog
        mode={mode}
        open={openDialog}
        onOpenChange={closeDialog}
        purchaseOrder={purchaseOrder}
      />
    </div>
  );
};

export default PurchaseOrderActions;
