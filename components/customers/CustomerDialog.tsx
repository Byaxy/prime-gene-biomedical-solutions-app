import { CustomerFormValues } from "@/lib/validation";
import { Customer } from "@/types/appwrite.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
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
        address: customer?.address || "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting customer:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Customer",
    edit: "Edit Customer",
    delete: "Delete Customer",
  }[mode];

  const dialogDescription = {
    add: "Add a new product customer to your collection.",
    edit: "Edit the selected customer.",
    delete:
      "Are you sure you want to delete this customer? This action cannot be undone.",
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
        ) : (
          <CustomerForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && customer
                ? {
                    name: customer?.name,
                    email: customer?.email || "",
                    phone: customer?.phone || "",
                    address: customer?.address || "",
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

export default CustomerDialog;
