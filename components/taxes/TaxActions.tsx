import { useState } from "react";
import { TaxFormValues } from "@/lib/validation";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TaxDialog from "./TaxDialog";
import { useTaxes } from "@/hooks/useTaxes";
import { Tax } from "@/types";

const TaxActions = ({ tax }: { tax: Tax }) => {
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");
  const [open, setOpen] = useState(false);
  const { softDeleteTax, editTax, isSoftDeletingTax, isEditingTax } =
    useTaxes();

  const handleAction = async (data: TaxFormValues) => {
    try {
      if (mode === "edit") {
        await editTax(
          { id: tax.id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        await softDeleteTax(tax.id, {
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
        className="text-[#475BE8] p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        onClick={() => {
          setMode("delete");
          setOpen(true);
        }}
        className="text-red-600 p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>
      <TaxDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        tax={tax}
        onSubmit={handleAction}
        isLoading={isSoftDeletingTax || isEditingTax}
      />
    </div>
  );
};

export default TaxActions;
