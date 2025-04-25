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

const QuotationActions = ({
  quotation,
}: {
  quotation: QuotationWithRelations;
}) => {
  const [open, setOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const router = useRouter();

  const { softDeleteQuotation, isSoftDeletingQuotation } = useQuotations();

  const handleAction = async () => {
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

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </PopoverTrigger>
        <PopoverContent className="w-72 flex flex-col mt-2 mr-12 gap-2 bg-white z-50">
          <p
            onClick={() => {
              toast.success("Quotation Details");
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
            onClick={() => {
              toast.success("Download Quotation");
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Download className="h-5 w-5" /> <span>Download Quotation</span>
          </p>
          <p
            onClick={() => {
              toast.success("Email Quotation");
            }}
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
              toast.success("Download RFQ");
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Download className="h-5 w-5" /> <span>Download RFQ</span>
          </p>
        </PopoverContent>
      </Popover>

      <QuotationDialog
        mode="delete"
        open={openDialog && mode === "delete"}
        onOpenChange={setOpenDialog}
        quotation={quotation.quotation}
        onSubmit={handleAction}
        isLoading={isSoftDeletingQuotation}
      />
    </div>
  );
};

export default QuotationActions;
