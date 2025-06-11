import { CustomerFormValues } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Customer } from "@/types";
import CustomerForm from "../forms/CustomerForm";

interface CustomerDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  customer?: Customer;
  onSubmit: (data: CustomerFormValues) => Promise<void>;
}

const CustomerDialog = ({
  mode,
  open,
  onOpenChange,
  isLoading,
  customer,
  onSubmit,
}: CustomerDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: customer?.name || "",
        email: customer?.email || "",
        phone: customer?.phone || "",
        address: {
          addressName: customer?.address?.addressName,
          address: customer?.address?.address || "",
          city: customer?.address?.city || "",
          state: customer?.address?.state || "",
          country: customer?.address?.country || "",
        },
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting customer:", error);
    } finally {
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-light-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl text-blue-800">
            Delete Customer
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            Are you sure you want to delete this customer? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {mode === "delete" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-500">
              Category: <span className="font-semibold">{customer?.name}</span>
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
        )}

        {mode === "add" && (
          <div className="flex flex-col gap-4">
            <CustomerForm mode="create" onCancel={() => onOpenChange(false)} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;
