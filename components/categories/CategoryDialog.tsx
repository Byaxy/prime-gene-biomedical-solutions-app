import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CategoryForm from "../forms/CategoriesForm";
import { Category } from "@/types";
import { useCategories } from "@/hooks/useCategories";

interface CategoryDialogProps {
  mode: "add" | "edit" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}

export function CategoryDialog({
  mode,
  open,
  onOpenChange,
  category,
}: CategoryDialogProps) {
  const { softDeleteCategory, isSoftDeletingCategory } = useCategories();

  const handleDelete = async () => {
    try {
      if (mode === "delete" && category) {
        await softDeleteCategory(category.id, {
          onSuccess: () => {
            onOpenChange(false);
          },
        });
      }
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
      <DialogContent className="sm:max-w-3xl bg-light-200">
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
                disabled={isSoftDeletingCategory}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSoftDeletingCategory}
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
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
