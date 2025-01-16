import { SupplierFormValues } from "@/lib/validation";
import { Supplier } from "@/types/appwrite.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import SupplierForm from "../forms/SupplierForm";

interface SupplierDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  supplier?: Supplier;
  onSubmit: (data: SupplierFormValues) => Promise<void>;
}

const SupplierDialog = ({
  mode,
  open,
  onOpenChange,
  isLoading,
  supplier,
  onSubmit,
}: SupplierDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: supplier?.name || "",
        email: supplier?.email || "",
        phone: supplier?.phone || "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting supplier:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Supplier",
    edit: "Edit Supplier",
    delete: "Delete Supplier",
  }[mode];

  const dialogDescription = {
    add: "Add a new product supplier to your collection.",
    edit: "Edit the selected supplier.",
    delete:
      "Are you sure you want to delete this supplier? This action cannot be undone.",
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
              Category: <span className="font-semibold">{supplier?.name}</span>
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
          <SupplierForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && supplier
                ? {
                    name: supplier?.name,
                    email: supplier?.email,
                    phone: supplier?.phone,
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

export default SupplierDialog;
