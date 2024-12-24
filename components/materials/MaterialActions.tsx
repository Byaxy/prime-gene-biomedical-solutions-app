import { useState } from "react";
import { MaterialFormValues } from "@/lib/validation";
import { Materials } from "@/types/appwrite.types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useMaterials } from "@/hooks/useMaterials";
import MaterialDialog from "./MaterialDialog";

const MaterialActions = ({ material }: { material: Materials }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const {
    softDeleteMaterial,
    editMaterial,
    isSoftDeletingMaterial,
    isEditingMaterial,
  } = useMaterials();

  const handleAction = async (data: MaterialFormValues) => {
    // Handle different actions based on mode
    try {
      if (mode === "edit") {
        // Edit material
        await editMaterial(
          { id: material.$id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        // Delete material
        await softDeleteMaterial(material.$id, {
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
      <MaterialDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        material={material}
        onSubmit={handleAction}
        isLoading={isSoftDeletingMaterial || isEditingMaterial}
      />
    </div>
  );
};

export default MaterialActions;
