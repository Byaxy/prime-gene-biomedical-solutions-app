import { QuotationFormValues } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Quotation } from "@/types";
interface QuotationDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  quotation?: Quotation;
  onSubmit: (data: QuotationFormValues) => Promise<void>;
}

const QuotationDialog = ({
  mode,
  open,
  onOpenChange,
  isLoading,
  quotation,
  onSubmit,
}: QuotationDialogProps) => {
  const handleDelete = async () => {
    try {
      if (quotation && quotation.id) {
        await onSubmit({
          ...quotation,
          products: [],
        });
      } else {
        throw new Error("Quotation is required.");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting quotation:", error);
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
                Delete Quotation
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this quotation? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Quotation Number:{" "}
                <span className="font-semibold">
                  {quotation?.quotationNumber}
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
};

export default QuotationDialog;
