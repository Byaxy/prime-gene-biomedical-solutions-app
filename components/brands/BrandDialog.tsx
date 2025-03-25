import { BrandFormValues } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import BrandForm from "../forms/BrandForm";
import { Brand } from "@/types";

interface BrandDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  brand?: Brand;
  onSubmit: (data: BrandFormValues) => Promise<void>;
}

const BrandDialog = ({
  mode,
  open,
  onOpenChange,
  isLoading,
  brand,
  onSubmit,
}: BrandDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: brand?.name || "",
        description: brand?.description || "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting brand:", error);
    } finally {
    }
  };
  const dialogTitle = {
    add: "Add Brand",
    edit: "Edit Brand",
    delete: "Delete Brand",
  }[mode];

  const dialogDescription = {
    add: "Add a new brand to your collection.",
    edit: "Edit the selected brand.",
    delete:
      "Are you sure you want to delete this brand? This action cannot be undone.",
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
              Brand: <span className="font-semibold">{brand?.name}</span>
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
          <BrandForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && brand
                ? {
                    ...brand,
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

export default BrandDialog;
