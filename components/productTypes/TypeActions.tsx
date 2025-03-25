import { useState } from "react";
import { useTypes } from "@/hooks/useTypes";
import { TypeFormValues } from "@/lib/validation";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ProductTypeDialog from "./ProductTypeDialog";
import { ProductType } from "@/types";

const TypeActions = ({ productType }: { productType: ProductType }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const { softDeleteType, editType, isSoftDeletingType, isEditingType } =
    useTypes();

  const handleAction = async (data: TypeFormValues) => {
    // Handle different actions based on mode
    try {
      if (mode === "edit") {
        // Edit type
        await editType(
          { id: productType.id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        // Delete type
        await softDeleteType(productType.id, {
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
