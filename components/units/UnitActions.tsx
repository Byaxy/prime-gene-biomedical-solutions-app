import { useState } from "react";
import { UnitFormValues } from "@/lib/validation";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import UnitsDialog from "./UnitsDialog";
import { useUnits } from "@/hooks/useUnits";
import { Unit } from "@/types";

const UnitActions = ({ unit }: { unit: Unit }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const { softDeleteUnit, editUnit, isSoftDeletingUnit, isEditingUnit } =
    useUnits();

  const handleAction = async (data: UnitFormValues) => {
    try {
      if (mode === "edit") {
        await editUnit(
          { id: unit.id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        await softDeleteUnit(unit.id, {
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
      <UnitsDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        unit={unit}
        onSubmit={handleAction}
        isLoading={isSoftDeletingUnit || isEditingUnit}
      />
    </div>
  );
};

export default UnitActions;
