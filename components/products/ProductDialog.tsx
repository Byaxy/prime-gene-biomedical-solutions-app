import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { ProductFormValues } from "@/lib/validation";
import { Product } from "@/types/appwrite.types";
import { cn } from "@/lib/utils";

interface ProductDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  product?: Product;
  onSubmit: (data: ProductFormValues) => Promise<void>;
}

export function ProductDialog({
  mode,
  open,
  onOpenChange,
  product,
  isLoading,
  onSubmit,
}: ProductDialogProps) {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: product?.name || "",
        description: product?.description || "",
        costPrice: product?.costPrice || 0,
        sellingPrice: product?.sellingPrice || 0,
        quantity: product?.quantity || 0,
        categoryId: product?.categoryId || "",
        typeId: product?.typeId || "",
        materialId: product?.materialId || "",
        colorId: product?.colorId || "",
        unitId: product?.unitId || "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting product:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Product",
    edit: "Edit Product",
    delete: "Delete Product",
  }[mode];

  const dialogDescription = {
    add: "Add a new product to your collection.",
    edit: "Edit the selected product.",
    delete:
      "Are you sure you want to delete this product? This action cannot be undone.",
  }[mode];

  return (
    <div>
      {mode === "delete" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className={cn(
              "sm:max-w-2xl bg-light-200 mx-2 sm:mx-0",
              mode === "delete" && "sm:max-w-lg"
            )}
          >
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl text-blue-800">
                {dialogTitle}
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                {dialogDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Product: <span className="font-semibold">{product?.name}</span>
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
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
