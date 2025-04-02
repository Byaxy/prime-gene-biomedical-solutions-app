import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExpenseFormValues } from "@/lib/validation";
import { Expense } from "@/types";

interface ExpenseDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  expense?: Expense;
  onSubmit: (data: ExpenseFormValues) => Promise<void>;
}

export function ExpenseDialog({
  mode,
  open,
  onOpenChange,
  expense,
  isLoading,
  onSubmit,
}: ExpenseDialogProps) {
  const handleDelete = async () => {
    try {
      await onSubmit({
        title: expense?.title || "",
        description: expense?.description || "",
        amount: expense?.amount || 0,
        paymentMethod: expense?.paymentMethod || "cash",
        expenseDate: expense?.expenseDate || new Date(),
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting expense:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Expense",
    edit: "Edit Expense",
    delete: "Delete Expense",
  }[mode];

  const dialogDescription = {
    add: "Add a new expense to your collection.",
    edit: "Edit the selected expense.",
    delete:
      "Are you sure you want to delete this expense? This action cannot be undone.",
  }[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-light-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl text-blue-800">
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {mode === "delete" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-500">
              expense: <span className="font-semibold">{expense?.title}</span>
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
      </DialogContent>
    </Dialog>
  );
}
