import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductWithRelations } from "@/types";
import BulkProductUpload from "./BulkProductUpload";
import ProductDetails from "./ProductDetails";
import { useProducts } from "@/hooks/useProducts";

interface ProductDialogProps {
  mode: "add" | "edit" | "delete" | "view" | "reactivate" | "deactivate";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  product?: ProductWithRelations;
  isBulkProductUpload?: boolean;
}

export function ProductDialog({
  mode,
  open,
  onOpenChange,
  product,
  isBulkProductUpload,
}: ProductDialogProps) {
  const {
    softDeleteProduct,
    isSoftDeletingProduct,
    deleteProduct,
    isDeletingProduct,
    reactivateProduct,
    isReactivatingProduct,
  } = useProducts();

  const handleDelete = async () => {
    try {
      if (mode === "delete" && product) {
        await deleteProduct(product.product.id, {
          onSuccess: () => onOpenChange(false),
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeactivate = async () => {
    try {
      if (mode === "deactivate" && product) {
        await softDeleteProduct(product.product.id, {
          onSuccess: () => onOpenChange(false),
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleReactivate = async () => {
    try {
      if (mode === "reactivate" && product) {
        await reactivateProduct(product.product.id, {
          onSuccess: () => onOpenChange(false),
        });
      }
    } catch (error) {
      console.error("Error:", error);
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
                Inventory:{" "}
                <span className="font-semibold">{product?.product?.name}</span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isDeletingProduct}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeletingProduct}
                  className="shad-danger-btn"
                >
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {mode === "deactivate" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-2xl bg-light-200 mx-2 sm:mx-0">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl text-blue-800">
                Deactivate Inventory
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to deactivate this inventory?
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Inventory:{" "}
                <span className="font-semibold">{product?.product?.name}</span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingProduct}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={isSoftDeletingProduct}
                  className="shad-danger-btn"
                >
                  Deactivate
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {mode === "reactivate" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-2xl bg-light-200 mx-2 sm:mx-0">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl text-blue-800">
                Reactivate Inventory
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to reactivate this inventory?
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-green-500">
                Inventory:{" "}
                <span className="font-semibold">{product?.product?.name}</span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingProduct}
                  className="shad-danger-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleReactivate}
                  disabled={isReactivatingProduct}
                  className="shad-primary-btn"
                >
                  Reactivate
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {mode === "add" && isBulkProductUpload && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className="sm:max-w-3xl bg-light-200 mx-2 sm:mx-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onInteractOutside={(e) => {
              if (e.target instanceof Element) {
                if (
                  e.target.closest('[role="listbox"]') ||
                  e.target.closest("[data-radix-select-viewport]") ||
                  e.target.closest("[data-radix-popper-content]")
                ) {
                  e.preventDefault();
                  return;
                }
              }

              const event = e.detail.originalEvent;
              if (event instanceof PointerEvent) {
                event.stopPropagation();
              }
            }}
          >
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
                className="shad-danger-btn"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {mode === "view" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className="sm:max-w-5xl bg-light-200 mx-2 sm:mx-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onInteractOutside={(e) => {
              if (e.target instanceof Element) {
                if (
                  e.target.closest('[role="listbox"]') ||
                  e.target.closest("[data-radix-select-viewport]") ||
                  e.target.closest("[data-radix-popper-content]")
                ) {
                  e.preventDefault();
                  return;
                }
              }

              const event = e.detail.originalEvent;
              if (event instanceof PointerEvent) {
                event.stopPropagation();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl text-blue-800">
                Inventory Details
              </DialogTitle>
              <DialogDescription className="text-dark-600">
                View the details of the selected inventory
              </DialogDescription>
            </DialogHeader>

            {product && <ProductDetails product={product} />}

            <div className="flex justify-end gap-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
