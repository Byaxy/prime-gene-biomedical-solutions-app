import { TaxFormValues } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import TaxForm from "../forms/TaxForm";
import { Tax } from "@/types";

interface TaxDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  tax?: Tax;
  onSubmit: (data: TaxFormValues) => Promise<void>;
}
const TaxDialog = ({
  mode,
  open,
  onOpenChange,
  tax,
  isLoading,
  onSubmit,
}: TaxDialogProps) => {
  const handleDelete = async () => {
    try {
      await onSubmit({
        taxRate: tax?.taxRate || 0,
        name: tax?.name || "",
        code: tax?.code || "",
        description: tax?.description,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting tax:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Tax",
    edit: "Edit Tax",
    delete: "Delete Tax",
  }[mode];

  const dialogDescription = {
    add: "Add a new tax to your collection.",
    edit: "Edit the selected tax.",
    delete:
      "Are you sure you want to delete this tax? This action cannot be undone.",
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
              Tax: <span className="font-semibold">{tax?.name}</span>
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
          <TaxForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && tax
                ? {
                    ...tax,
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

export default TaxDialog;
