import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
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
import { ShipmentWithRelations } from "@/types";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import ShipmentPDF from "./ShipmentPDF";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import ShipmentDialog from "./ShipmentDialog";

interface Props {
  shipment: ShipmentWithRelations;
}

const ShipmentActions = ({ shipment }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "view">("add");

  const router = useRouter();

  const { companySettings } = useCompanySettings();

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
      if (!shipment) {
        throw new Error("Shipment is required to generate PDF.");
      }
      const blob = await pdf(
        <ShipmentPDF
          shipment={shipment}
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
      link.download = `shipment_${
        shipment?.shipment.shipmentRefNumber || Date.now()
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
      if (!shipment.vendors[0].email) {
        toast.error("Vendor email not found");
        return;
      }

      const subject = `Shipment Reference Number: ${
        shipment.shipment.shipmentRefNumber || "N/A"
      }`;
      const body = `Dear ${
        shipment.vendors[0].name || "Supplier"
      },\n\nPlease find attached the shipment as requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        shipment.vendors[0].email
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

          <DropdownMenuItem
            onClick={() => {
              setMode("edit");
              router.push(
                `/purchases/shipments/edit-shipment/${shipment.shipment.id}`
              );
            }}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="h-5 w-5" />
            <span>Edit Shipment</span>
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
            <span>Email Shipment</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" />
            <span>Delete Shipment</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShipmentDialog
        mode={mode}
        open={openDialog}
        onOpenChange={closeDialog}
        shipment={shipment}
      />
    </div>
  );
};

export default ShipmentActions;
