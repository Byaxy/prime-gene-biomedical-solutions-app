import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductFormValues } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Product } from "@/types";

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
        alertQuantity: product?.alertQuantity || 0,
        quantity: product?.quantity || 0,
        categoryId: product?.categoryId || "",
        typeId: product?.typeId || "",
        unitId: product?.unitId || "",
        brandId: product?.brandId || "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting product:", error);
    } finally {
    }
  };

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
                Delete Inventory
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this inventory? This action
                cannot be undone.
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
