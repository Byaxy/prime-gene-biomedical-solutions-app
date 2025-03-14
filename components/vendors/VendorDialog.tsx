import { VendorFormValues } from "@/lib/validation";
import { Vendor } from "@/types/appwrite.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import VendorForm from "../forms/VendorForm";

interface VendorDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  vendor?: Vendor;
  onSubmit: (data: VendorFormValues) => Promise<void>;
}

const VendorDialog = ({
  mode,
  open,
  onOpenChange,
  isLoading,
  vendor,
  onSubmit,
}: VendorDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: vendor?.name || "",
        email: vendor?.email || "",
        phone: vendor?.phone || "",
        address: vendor?.address || "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting vendor:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Vendor",
    edit: "Edit Vendor",
    delete: "Delete Vendor",
  }[mode];

  const dialogDescription = {
    add: "Add a new product vendor to your collection.",
    edit: "Edit the selected vendor.",
    delete:
      "Are you sure you want to delete this vendor? This action cannot be undone.",
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
              Category: <span className="font-semibold">{vendor?.name}</span>
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
          <VendorForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && vendor
                ? {
                    $id: vendor.$id,
                    name: vendor?.name || "",
                    email: vendor?.email || "",
                    phone: vendor?.phone || "",
                    address: vendor?.address || "",
                    $createdAt: vendor.$createdAt,
                    $updatedAt: vendor.$updatedAt,
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

export default VendorDialog;
