import { Quotation } from "@/types/appwrite.types";
import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useQuotations } from "@/hooks/useQuotations";
import { QuotationFormValues } from "@/lib/validation";
import QuotationDialog from "./QuotationsDialog";
import QuotationSheet from "./QuotationSheet";

const QuotationActions = ({ quotation }: { quotation: Quotation }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const {
    editQuotation,
    deleteQuotation,
    isDeletingQuotation,
    isEditingQuotation,
  } = useQuotations();

  const handleAction = async (data: QuotationFormValues) => {
    try {
      if (mode === "edit") {
        await editQuotation(
          { id: quotation.$id, data },
          {
            onSuccess: () => setOpen(false),
          }
        );
      } else if (mode === "delete") {
        await deleteQuotation(quotation.$id, {
          onSuccess: () => setOpen(false),
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="flex items-center">
      <span
        onClick={() => {
          setMode("edit");
          setOpen(true);
        }}
        className="text-[#475BE8] p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        onClick={() => {
          setMode("delete");
          setOpen(true);
        }}
        className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>
      <QuotationSheet
        mode={"edit"}
        open={open && mode === "edit"}
        onOpenChange={setOpen}
        quotation={quotation}
        onSubmit={handleAction}
        isLoading={isEditingQuotation}
      />
      <QuotationDialog
        mode="delete"
        open={open && mode === "delete"}
        onOpenChange={setOpen}
        quotation={quotation}
        onSubmit={handleAction}
        isLoading={isDeletingQuotation}
      />
    </div>
  );
};

export default QuotationActions;
