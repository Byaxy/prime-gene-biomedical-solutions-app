import { useRouter } from "next/navigation";
import { useState } from "react";
import WaybillPDF from "./WaybillPDF";
import { WaybillWithRelations } from "@/types";
import toast from "react-hot-toast";
import WaybillDialog from "./WaybillDialog";
import { EllipsisVertical } from "lucide-react";
import { Eye } from "lucide-react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Mail } from "lucide-react";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import LoanWaybillProductsDialog from "./LoanWaybillProductsDialog";

const WaybillActions = ({ waybill }: { waybill: WaybillWithRelations }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "view">("add");

  const router = useRouter();

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
            <span>Waybill Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMode("edit");
              router.push(`/waybills/edit-waybill/${waybill.waybill.id}`);
            }}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="h-5 w-5" />
            <span>Edit Waybill</span>
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
            <span>Email Waybill</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" />
            <span>Delete Waybill</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <LoanWaybillProductsDialog
              products={waybill.products}
              waybillType={waybill.waybill.waybillType}
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WaybillDialog
        mode={mode}
        open={openDialog}
        onOpenChange={setOpenDialog}
        waybill={waybill}
      />
    </div>
  );
};

export default WaybillActions;
