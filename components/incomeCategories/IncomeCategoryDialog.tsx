"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { IncomeCategoryWithRelations } from "@/types";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";

interface IncomeCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: IncomeCategoryWithRelations;
}

const IncomeCategoryDialog: React.FC<IncomeCategoryDialogProps> = ({
  open,
  onOpenChange,
  category,
}) => {
  const { softDeleteIncomeCategory, isSoftDeletingIncomeCategory } =
    useIncomeCategories();

  const handleDelete = async () => {
    try {
      if (category?.incomeCategory?.id) {
        await softDeleteIncomeCategory(category.incomeCategory.id, {
          onSuccess: () => {
            toast.success("Income Category deactivated successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deactivating category:", error);
            toast.error(error.message || "Failed to deactivate category.");
          },
        });
      } else {
        throw new Error("Category ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-light-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            Deactivate Income Category
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            Are you sure you want to deactivate this income category? This
            action will prevent new payments from using it but will preserve
            historical data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSoftDeletingIncomeCategory}
            className="shad-primary-btn"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isSoftDeletingIncomeCategory}
            className="shad-danger-btn"
          >
            Deactivate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomeCategoryDialog;
