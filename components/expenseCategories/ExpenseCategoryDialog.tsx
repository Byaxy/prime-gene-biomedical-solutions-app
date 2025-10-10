"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExpenseCategoryWithRelations } from "@/types";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import toast from "react-hot-toast";

interface ExpenseCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ExpenseCategoryWithRelations;
}

const ExpenseCategoryDialog: React.FC<ExpenseCategoryDialogProps> = ({
  open,
  onOpenChange,
  category,
}) => {
  const { softDeleteExpenseCategory, isSoftDeletingExpenseCategory } =
    useExpenseCategories();

  const handleDelete = async () => {
    try {
      if (category?.expenseCategory?.id) {
        await softDeleteExpenseCategory(category.expenseCategory.id, {
          onSuccess: () => {
            toast.success("Expense Category deactivated successfully.");
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
            Deactivate Expense Category
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            Are you sure you want to deactivate this expense category? This
            action will prevent new expenses from using it but will preserve
            historical data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSoftDeletingExpenseCategory}
            className="shad-primary-btn"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isSoftDeletingExpenseCategory}
            className="shad-danger-btn"
          >
            Deactivate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseCategoryDialog;
