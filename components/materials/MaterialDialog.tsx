import { MaterialFormValues } from "@/lib/validation";
import { Materials } from "@/types/appwrite.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import MaterialForm from "../forms/MaterialForm";

interface MaterialDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  material?: Materials;
  onSubmit: (data: MaterialFormValues) => Promise<void>;
}
const MaterialDialog = ({
  mode,
  open,
  onOpenChange,
  isLoading,
  material,
  onSubmit,
}: MaterialDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: material?.name || "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting material:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Material",
    edit: "Edit Material",
    delete: "Delete Material",
  }[mode];

  const dialogDescription = {
    add: "Add a new material to your collection.",
    edit: "Edit the selected material.",
    delete:
      "Are you sure you want to delete this material? This action cannot be undone.",
  }[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-light-200">
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
              Category: <span className="font-semibold">{material?.name}</span>
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
          <MaterialForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit"
                ? {
                    name: material?.name || "",
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

export default MaterialDialog;
