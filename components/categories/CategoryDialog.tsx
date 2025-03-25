import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { CategoryFormValues } from "@/lib/validation";
import CategoryForm from "../forms/CategoriesForm";
import { Category } from "@/types";

interface CategoryDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  category?: Category;
  onSubmit: (data: CategoryFormValues) => Promise<void>;
}

export function CategoryDialog({
  mode,
  open,
  onOpenChange,
  category,
  isLoading,
  onSubmit,
}: CategoryDialogProps) {
  const handleDelete = async () => {
    try {
      await onSubmit({
        name: category?.name || "",
        description: category?.description ?? "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting category:", error);
    } finally {
    }
  };

  const dialogTitle = {
    add: "Add Category",
    edit: "Edit Category",
    delete: "Delete Category",
  }[mode];

  const dialogDescription = {
    add: "Add a new category to your collection.",
    edit: "Edit the selected category.",
    delete:
      "Are you sure you want to delete this category? This action cannot be undone.",
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

        {mode === "delete" ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-500">
              Category: <span className="font-semibold">{category?.name}</span>
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
          <CategoryForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && category
                ? {
                    ...category,
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
}
