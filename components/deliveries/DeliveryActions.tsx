import { DeliveryWithRelations } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { EllipsisVertical } from "lucide-react";
import { Eye } from "lucide-react";
import { Download } from "lucide-react";
import { Mail } from "lucide-react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import DeliveryNote from "./DeliveryNote";
import DeliveryDialog from "./DeliveryDialog";

const DeliveryActions = ({ delivery }: { delivery: DeliveryWithRelations }) => {
  const [open, setOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "view">("add");

  const router = useRouter();

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
            <span>Delivery Details</span>
          </p>

          <p
            onClick={() => {
              setMode("edit");
              router.push(`/deliveries/edit-delivery/${delivery.delivery.id}`);
              setOpen(false);
            }}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="h-5 w-5" /> <span>Edit Delivery</span>
          </p>
          <p
            onClick={() => {
              handleDownloadPDF();
              setOpen(false);
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Download className="h-5 w-5" /> <span>Download as PDF</span>
          </p>
          <p
            onClick={() => {
              handleEmailDelivery();
              setOpen(false);
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Mail className="h-5 w-5" /> <span>Email Delivery Note</span>
          </p>

          <p
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
              setOpen(false);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" /> <span>Delete Delivery</span>
          </p>
        </PopoverContent>
      </Popover>

      <DeliveryDialog
        mode={mode}
        open={openDialog}
        onOpenChange={setOpenDialog}
        delivery={delivery}
      />
    </div>
  );
};

export default DeliveryActions;
