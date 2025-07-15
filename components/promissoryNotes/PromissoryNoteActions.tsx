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
import toast from "react-hot-toast";
import PromissoryNotePDF from "./PromissoryNotePDF";
import { useRouter } from "next/navigation";
import { PromissoryNoteWithRelations } from "@/types";
import { useState } from "react";
import PromissoryNoteDialog from "./PromissoryNoteDialog";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const PromissoryNoteActions = ({
  promissoryNote,
}: {
  promissoryNote: PromissoryNoteWithRelations;
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "view">("add");

  const { companySettings } = useCompanySettings();

  const router = useRouter();

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
    } catch (error) {
      console.error("Error preparing email:", error);
      toast.error("Failed to prepare email");
    }
  };

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

  return (
    <div>
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
            <span>Promissory Note Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMode("edit");
              router.push(
                `/promissory-notes/edit-promissory-note/${promissoryNote.promissoryNote.id}`
              );
            }}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="h-5 w-5" />
            <span>Edit Promissory Note</span>
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
            <span>Email Promissory Note</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" />
            <span>Delete Promissory Note</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PromissoryNoteDialog
        mode={mode}
        open={openDialog}
        onOpenChange={closeDialog}
        promissoryNote={promissoryNote}
      />
    </div>
  );
};

export default PromissoryNoteActions;
