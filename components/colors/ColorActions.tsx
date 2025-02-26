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
    try {
      if (mode === "edit") {
        await editColor(
          { id: color.$id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
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
