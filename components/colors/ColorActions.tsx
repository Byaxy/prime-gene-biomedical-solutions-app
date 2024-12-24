import { useState } from "react";
import { ColorFormValues } from "@/lib/validation";
import { Colors } from "@/types/appwrite.types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useColors } from "@/hooks/useColors";
import ColorDialog from "./ColorDialog";

const ColorActions = ({ color }: { color: Colors }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const { softDeleteColor, editColor, isSoftDeletingColor, isEditingColor } =
    useColors();

  const handleAction = async (data: ColorFormValues) => {
    // Handle different actions based on mode
    try {
      if (mode === "edit") {
        // Edit type
        await editColor(
          { id: color.$id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        // Delete type
        await softDeleteColor(color.$id, {
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
      <ColorDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        color={color}
        onSubmit={handleAction}
        isLoading={isSoftDeletingColor || isEditingColor}
      />
    </div>
  );
};

export default ColorActions;
