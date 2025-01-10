import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PurchaseFormValues } from "@/lib/validation";
import { Purchase } from "@/types/appwrite.types";

interface PurchaseDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  purchase?: Purchase;
  onSubmit: (data: PurchaseFormValues) => Promise<void>;
}

export function PurchaseDialog({
  mode,
  open,
  onOpenChange,
  purchase,
  isLoading,
  onSubmit,
}: PurchaseDialogProps) {
  const handleDelete = async () => {
    try {
      if (purchase && purchase.$id) {
        await onSubmit({
          ...purchase,
        });
      } else {
        throw new Error("Purchase is required.");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting purchase:", error);
    } finally {
    }
  };

  return (
    <div>
      {mode === "delete" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-xl bg-light-200">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl text-blue-800">
                Delete Purchase
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this purchase? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Purchase:{" "}
                <span className="font-semibold">
                  {purchase?.purchaseOrderNumber}
                </span>
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
