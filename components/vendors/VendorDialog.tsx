import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import VendorForm from "../forms/VendorForm";
import { Vendor } from "@/types";
import { useVendors } from "@/hooks/useVendors";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface VendorDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor;
}

const VendorDialog = ({
  mode,
  open,
  onOpenChange,
  vendor,
}: VendorDialogProps) => {
  const { softDeleteVendor, isSoftDeletingVendor } = useVendors();
  const handleDelete = async () => {
    try {
      if (mode === "delete" && vendor?.id && vendor.id !== "") {
        await softDeleteVendor(vendor?.id, {
          onSuccess: () => {
            toast.success("Vendor deleted successfully!");
          },
          onError: (error) => {
            console.error("Delete vendor error:", error);
            toast.error("Failed to delete vendor");
          },
        });
        onOpenChange(false);
      }
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
      <DialogContent
        className={cn(
          "sm:max-w-3xl bg-light-200",
          mode === "edit" && "sm:max-w-5xl"
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

        {mode === "delete" ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-500">
              Vendor: <span className="font-semibold">{vendor?.name}</span>
            </p>
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSoftDeletingVendor}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSoftDeletingVendor}
                className="shad-danger-btn"
              >
                {isSoftDeletingVendor ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <VendorForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && vendor
                ? {
                    ...vendor,
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

export default VendorDialog;
