import { useBrands } from "@/hooks/useBrands";
import { BrandFormValues } from "@/lib/validation";
import { Brand } from "@/types/appwrite.types";
import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BrandDialog from "./BrandDialog";

const BrandActions = ({ brand }: { brand: Brand }) => {
  const { softDeleteBrand, editBrand, isSoftDeletingBrand, isEditingBrand } =
    useBrands();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const handleAction = async (data: BrandFormValues) => {
    try {
      if (mode === "edit") {
        // Edit brand
        await editBrand(
          { id: brand.$id, data },
          { onSuccess: () => setOpen(false) }
        );
      } else if (mode === "delete") {
        // Delete brand
        await softDeleteBrand(brand.$id, {
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

      <BrandDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        brand={brand}
        onSubmit={handleAction}
        isLoading={isSoftDeletingBrand || isEditingBrand}
      />
    </div>
  );
};

export default BrandActions;
