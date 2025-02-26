import { TypeFormValues } from "@/lib/validation";
import { ProductType } from "@/types/appwrite.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import ProductTypeForm from "../forms/ProductTypeForm";

interface ProductTypeDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  productType?: ProductType;
  onSubmit: (data: TypeFormValues) => Promise<void>;
}
const ProductTypeDialog = ({
  mode,
  open,
  onOpenChange,
  productType,
  isLoading,
  onSubmit,
}: ProductTypeDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: productType?.name || "",
        description: productType?.description,
      });
      onOpenChange(false);
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
              Category:{" "}
              <span className="font-semibold">{productType?.name}</span>
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
          <ProductTypeForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit"
                ? {
                    name: productType?.name || "",
                    description: productType?.description,
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

export default ProductTypeDialog;
