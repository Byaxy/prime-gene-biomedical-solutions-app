/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CategoryFormValues } from "@/lib/validation";
import toast from "react-hot-toast";
import {
  addCategory,
  deleteCategory,
  editCategory,
  getCategories,
  softDeleteCategory,
} from "@/lib/actions/category.actions";

export const useCategories = () => {
  const queryClient = useQueryClient();

  // Get all categories
  const {
    data: categories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const result = await getCategories();

      if (!result) {
        throw new Error("Failed to fetch categories");
      }
      return result;
    },
  });

  // Add category mutation
  const { mutate: addCategoryMutation, status: addCategoryStatus } =
    useMutation({
      mutationFn: (data: CategoryFormValues) => addCategory(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        toast.success("Category added successfully");
      },
      onError: (error: any) => {
        console.error("Error adding category:", error);
        toast.error("Failed to add category");
      },
    });

  // Edit category mutation
  const { mutate: editCategoryMutation, status: editCategoryStatus } =
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: CategoryFormValues }) =>
        editCategory(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        toast.success("Category updated successfully");
      },
      onError: (error) => {
        console.error("Error updating category:", error);
        toast.error("Failed to update category");
      },
    });

  // Soft Delete category mutation
  const {
    mutate: softDeleteCategoryMutation,
    status: softDeleteCategoryStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    },
  });

  // Permanently Delete category mutation
  const { mutate: deleteCategoryMutation, status: deleteCategoryStatus } =
    useMutation({
      mutationFn: (id: string) => deleteCategory(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        toast.success("Category deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting category:", error);
        toast.error("Failed to delete category");
      },
    });

  return {
    categories,
    isLoading,
    error,
    addCategory: addCategoryMutation,
    editCategory: editCategoryMutation,
    softDeleteCategory: softDeleteCategoryMutation,
    deleteCategory: deleteCategoryMutation,
    isAddingCategory: addCategoryStatus === "pending",
    isEditingCategory: editCategoryStatus === "pending",
    isDeletingCategory: deleteCategoryStatus === "pending",
    isSoftDeletingCategory: softDeleteCategoryStatus === "pending",
  };
};
