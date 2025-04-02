import { SaleFormValues } from "@/lib/validation";
import { Sale } from "@/types/appwrite.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
interface SaleDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  sale?: Sale;
  onSubmit: (data: SaleFormValues) => Promise<void>;
}

const SaleDialog = ({
  mode,
  open,
  onOpenChange,
  isLoading,
  sale,
  onSubmit,
}: SaleDialogProps) => {
  const handleDelete = async () => {
    try {
      if (sale && sale.$id) {
        await onSubmit({
          ...sale,
        });
      } else {
        throw new Error("Sale is required.");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting sale:", error);
    } finally {
    }
  };

  return (
    <div>
      {mode === "delete" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-2xl bg-light-200">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl text-blue-800">
                Delete Sale
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this sale? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Sale Invoice Number:{" "}
                <span className="font-semibold">{sale?.invoiceNumber}</span>
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
};

export default SaleDialog;
