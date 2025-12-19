import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import ProductTypeForm from "../forms/ProductTypeForm";
import { ProductType } from "@/types";
import { useTypes } from "@/hooks/useTypes";

interface ProductTypeDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType?: ProductType;
}
const ProductTypeDialog = ({
  mode,
  open,
  onOpenChange,
  productType,
}: ProductTypeDialogProps) => {
  const { softDeleteType, isSoftDeletingType } = useTypes();
  const handleDelete = async () => {
    try {
      if (mode === "delete" && productType) {
        await softDeleteType(productType.id, {
          onSuccess: () => {
            onOpenChange(false);
          },
        });
      }
    } catch (error) {
      console.error("Error deleting type:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Type",
    edit: "Edit Type",
    delete: "Delete Type",
  }[mode];

  const dialogDescription = {
    add: "Add a new product type to your collection.",
    edit: "Edit the selected type.",
    delete:
      "Are you sure you want to delete this product type? This action cannot be undone.",
  }[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl bg-light-200"
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
              Category:{" "}
              <span className="font-semibold">{productType?.name}</span>
            </p>
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSoftDeletingType}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSoftDeletingType}
                className="shad-danger-btn"
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <ProductTypeForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && productType
                ? {
                    ...productType,
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

export default ProductTypeDialog;
