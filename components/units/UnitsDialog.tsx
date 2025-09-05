import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import UnitsForm from "../forms/UnitsForm";
import { Unit } from "@/types";
import { useUnits } from "@/hooks/useUnits";

interface UnitDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: Unit;
}
const UnitsDialog = ({ mode, open, onOpenChange, unit }: UnitDialogProps) => {
  const { softDeleteUnit, isSoftDeletingUnit } = useUnits();
  const handleDelete = async () => {
    try {
      if (mode === "delete" && unit) {
        await softDeleteUnit(unit.id, {
          onSuccess: () => {
            onOpenChange(false);
          },
        });
      }
    } catch (error) {
      console.error("Error deleting unit:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Unit",
    edit: "Edit Unit",
    delete: "Delete Unit",
  }[mode];

  const dialogDescription = {
    add: "Add a new product unit to your collection.",
    edit: "Edit the selected unit.",
    delete:
      "Are you sure you want to delete this product unit? This action cannot be undone.",
  }[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-light-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl text-blue-800">
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {mode === "delete" ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-500">
              Unit: <span className="font-semibold">{unit?.name}</span>
            </p>
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSoftDeletingUnit}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSoftDeletingUnit}
                className="shad-danger-btn"
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <UnitsForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && unit
                ? {
                    ...unit,
                  }
                : undefined
            }
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UnitsDialog;
