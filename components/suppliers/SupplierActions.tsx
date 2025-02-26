import { useState } from "react";
import { SupplierFormValues } from "@/lib/validation";
import { Supplier } from "@/types/appwrite.types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useSuppliers } from "@/hooks/useSuppliers";
import SupplierDialog from "./SupplierDialog";

const SupplierActions = ({ supplier }: { supplier: Supplier }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const {
    softDeleteSupplier,
    editSupplier,
    isSoftDeletingSupplier,
    isEditingSupplier,
  } = useSuppliers();

  const handleAction = async (data: SupplierFormValues) => {
    try {
      if (mode === "edit") {
        await editSupplier(
          { id: supplier.$id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        await softDeleteSupplier(supplier.$id, {
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
      <SupplierDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        supplier={supplier}
        onSubmit={handleAction}
        isLoading={isSoftDeletingSupplier || isEditingSupplier}
      />
    </div>
  );
};

export default SupplierActions;
