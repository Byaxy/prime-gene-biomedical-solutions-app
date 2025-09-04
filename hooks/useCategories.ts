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
import { useEffect, useState } from "react";

interface UseCategoriesOptions {
  getAllCategories?: boolean;
  initialPageSize?: number;
}

export const useCategories = ({
  getAllCategories = false,
  initialPageSize = 10,
}: UseCategoriesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const shouldFetchAll = getAllCategories;

  const isShowAllMode = pageSize === 0;

  // Query for all categories
  const allCategoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const result = await getCategories(0, 0, true);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated categories
  const paginatedCategoriesQuery = useQuery({
    queryKey: ["categories", "paginatedCategories", page, pageSize],
    queryFn: async () => {
      const result = await getCategories(page, pageSize, false);
      return result;
    },
    enabled: !shouldFetchAll && !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode
      ? allCategoriesQuery
      : paginatedCategoriesQuery;
  const categories =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedCategoriesQuery.data &&
      page * pageSize < paginatedCategoriesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["categories", "paginatedCategories", page + 1, pageSize],
        queryFn: () => getCategories(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedCategoriesQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
  ]);

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  // Add category mutation
  const { mutate: addCategoryMutation, status: addCategoryStatus } =
    useMutation({
      mutationFn: (data: CategoryFormValues) => addCategory(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        toast.success("Category added successfully");
      },
      onError: (error) => {
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
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isFetching: activeQuery.isFetching,
    page,
    setPage,
    pageSize,
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
