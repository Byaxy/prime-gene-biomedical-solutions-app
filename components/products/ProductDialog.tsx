import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductFormValues } from "@/lib/validation";
import { Product } from "@/types";
import BulkProductUpload from "./BulkProductUpload";

interface ProductDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  product?: Product;
  onSubmit?: (data: ProductFormValues) => Promise<void>;
  isBulkProductUpload?: boolean;
}

export function ProductDialog({
  mode,
  open,
  onOpenChange,
  product,
  isLoading,
  onSubmit,
  isBulkProductUpload,
}: ProductDialogProps) {
  const handleDelete = async () => {
    try {
      if (onSubmit) {
        await onSubmit({
          productID: product?.id || "",
          name: product?.name || "",
          taxRateId: product?.taxRateId || "",
          costPrice: product?.costPrice || 0,
          sellingPrice: product?.sellingPrice || 0,
          description: product?.description || "",
          alertQuantity: product?.alertQuantity || 0,
          quantity: product?.quantity || 0,
          categoryId: product?.categoryId || "",
          typeId: product?.typeId || "",
          unitId: product?.unitId || "",
          brandId: product?.brandId || "",
        });
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  return (
    <div>
      {mode === "delete" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-2xl bg-light-200 mx-2 sm:mx-0">
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

      {mode === "add" && isBulkProductUpload && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-3xl bg-light-200 mx-2 sm:mx-0">
            <DialogHeader>
              <DialogTitle className="text-xl text-blue-800">
                Bulk Inventory Upload
              </DialogTitle>
              <DialogDescription className="text-dark-600">
                Upload an Excel file to import multiple products at once
              </DialogDescription>
            </DialogHeader>

            <BulkProductUpload closeDialog={() => onOpenChange(false)} />

            <div className="flex justify-end gap-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="shad-danger-btn"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
