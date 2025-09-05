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
import { useBrands } from "@/hooks/useBrands";

interface BrandDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand;
}

const BrandDialog = ({ mode, open, onOpenChange, brand }: BrandDialogProps) => {
  const { softDeleteBrand, isSoftDeletingBrand } = useBrands();
  const handleDelete = async () => {
    try {
      if (mode === "delete" && brand) {
        await softDeleteBrand(brand.id, {
          onSuccess: () => {
            onOpenChange(false);
          },
        });
      }
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
              Brand: <span className="font-semibold">{brand?.name}</span>
            </p>
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSoftDeletingBrand}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSoftDeletingBrand}
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
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BrandDialog;
