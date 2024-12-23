import { useState } from "react";
import { useTypes } from "@/hooks/useTypes";
import { TypeFormValues } from "@/lib/validation";
import { ProductTypes } from "@/types/appwrite.types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ProductTypeDialog from "./ProductTypeDialog";

const TypeActions = ({ productType }: { productType: ProductTypes }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const { softDeleteType, editType, isSoftDeletingType, isEditingType } =
    useTypes();

  const handleAction = async (data: TypeFormValues) => {
    // Handle different actions based on mode
    try {
      if (mode === "edit") {
        // Edit category
        await editType(
          { id: productType.$id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        // Delete category
        await softDeleteType(productType.$id, {
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
        className="text-[#475BE8] p-1 hover:bg-light-200 hover:rounded-md"
      >
        <EditIcon className="h-4 w-4" />
      </span>
      <span
        onClick={() => {
          setMode("delete");
          setOpen(true);
        }}
        className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md"
      >
        <DeleteIcon className="h-4 w-4" />
      </span>
      <ProductTypeDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        productType={productType}
        onSubmit={handleAction}
        isLoading={isSoftDeletingType || isEditingType}
      />
    </div>
  );
};

export default TypeActions;
