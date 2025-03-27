import { StoreFormValues } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Store } from "@/types";
import StoreForm from "../forms/StoreForm";

interface StoreDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  store?: Store;
  onSubmit: (data: StoreFormValues) => Promise<void>;
}
const StoreDialog = ({
  mode,
  open,
  onOpenChange,
  store,
  isLoading,
  onSubmit,
}: StoreDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: store?.name || "",
        location: store?.location || "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting store:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Store",
    edit: "Edit Store",
    delete: "Delete Store",
  }[mode];

  const dialogDescription = {
    add: "Add a new product store to your collection.",
    edit: "Edit the selected store.",
    delete:
      "Are you sure you want to delete this product store? This action cannot be undone.",
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
              Store: <span className="font-semibold">{store?.name}</span>
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
          <StoreForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && store
                ? {
                    ...store,
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

export default StoreDialog;
