import { UnitFormValues } from "@/lib/validation";
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

interface UnitDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  unit?: Unit;
  onSubmit: (data: UnitFormValues) => Promise<void>;
}
const UnitsDialog = ({
  mode,
  open,
  onOpenChange,
  unit,
  isLoading,
  onSubmit,
}: UnitDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: unit?.name || "",
        code: unit?.code || "",
        description: unit?.description,
      });
      onOpenChange(false);
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
                disabled={isLoading}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
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
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UnitsDialog;
