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
import { AccompanyingExpenseTypeWithRelations } from "@/types";
import { useAccompanyingExpenseTypes } from "@/hooks/useAccompanyingExpenseTypes";
import toast from "react-hot-toast";

interface AccompanyingExpenseTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accompanyingType: AccompanyingExpenseTypeWithRelations;
}

const AccompanyingExpenseTypeDialog: React.FC<
  AccompanyingExpenseTypeDialogProps
> = ({ open, onOpenChange, accompanyingType }) => {
  const {
    softDeleteAccompanyingExpenseType,
    isSoftDeletingAccompanyingExpenseType,
  } = useAccompanyingExpenseTypes();

  const handleDelete = async () => {
    try {
      if (accompanyingType?.type?.id) {
        await softDeleteAccompanyingExpenseType(accompanyingType.type.id, {
          onSuccess: () => {
            toast.success(
              "Accompanying Expense Type deactivated successfully."
            );
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deactivating accompanying type:", error);
            toast.error(
              error.message || "Failed to deactivate accompanying type."
            );
          },
        });
      } else {
        throw new Error(
          "Accompanying Expense Type ID is required for deletion."
        );
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-light-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            Deactivate Accompanying Expense Type
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            Are you sure you want to deactivate this accompanying expense type?
            This action will prevent new items from using it but will preserve
            historical data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSoftDeletingAccompanyingExpenseType}
            className="shad-primary-btn"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isSoftDeletingAccompanyingExpenseType}
            className="shad-danger-btn"
          >
            Deactivate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccompanyingExpenseTypeDialog;
