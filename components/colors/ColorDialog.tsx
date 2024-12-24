import { ColorFormValues } from "@/lib/validation";
import { Colors } from "@/types/appwrite.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import ColorForm from "../forms/ColorForm";

interface ColorDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  color?: Colors;
  onSubmit: (data: ColorFormValues) => Promise<void>;
}

const ColorDialog = ({
  mode,
  open,
  onOpenChange,
  isLoading,
  color,
  onSubmit,
}: ColorDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: color?.name || "",
        code: color?.code || "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting color:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Color",
    edit: "Edit Color",
    delete: "Delete Color",
  }[mode];

  const dialogDescription = {
    add: "Add a new product color to your collection.",
    edit: "Edit the selected color.",
    delete:
      "Are you sure you want to delete this product color? This action cannot be undone.",
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
              Category: <span className="font-semibold">{color?.name}</span>
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
          <ColorForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit"
                ? {
                    name: color?.name || "",
                    code: color?.code || "",
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

export default ColorDialog;
