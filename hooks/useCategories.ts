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
import { useCallback, useEffect, useMemo, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Category } from "@/types";

interface UseCategoriesOptions {
  getAllCategories?: boolean;
  initialData?: { documents: Category[]; total: number };
}

export interface CategoryFilters {
  search?: string;
}

export const defaultCategoryFilters: CategoryFilters = {
  search: "",
};

export const useCategories = ({
  getAllCategories = false,
  initialData,
}: UseCategoriesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllCategories) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: CategoryFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllCategories, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["categories", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getCategories(
        page,
        pageSize,
        getAllCategories || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllCategories ? 60000 : 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Optimistic navigation function
  const navigate = useCallback(
    (
      updates: Partial<{
        page: number;
        pageSize: number;
        search: string;
        filters: Partial<CategoryFilters>;
      }>
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates
      if (updates.page !== undefined) {
        if (updates.page === 0) {
          params.delete("page");
        } else {
          params.set("page", String(updates.page));
        }
      }

      if (updates.pageSize !== undefined) {
        if (updates.pageSize === 10) {
          params.delete("pageSize");
        } else {
          params.set("pageSize", String(updates.pageSize));
        }
      }

      if (updates.search !== undefined) {
        if (updates.search.trim()) {
          params.set("search", updates.search.trim());
        } else {
          params.delete("search");
        }
        params.delete("page");
      }

      if (updates.filters) {
        Object.keys(defaultCategoryFilters).forEach((key) =>
          params.delete(key)
        );

        Object.entries(updates.filters).forEach(([key, value]) => {
          if (value === undefined || value === "" || value === null) {
            params.delete(key);
          } else {
            params.set(key, String(value));
          }
        });
        params.delete("page");
      }

      const newUrl = `?${params.toString()}`;

      // Use startTransition for non-urgent updates
      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });

      // Prefetch the new data immediately
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: CategoryFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "categories",
        newPage,
        newPageSize,
        newFilters,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getCategories(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllCategories) return;
      navigate({ page });
    },
    [getAllCategories, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllCategories) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllCategories, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllCategories) return;
      navigate({ search });
    },
    [getAllCategories, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<CategoryFilters>) => {
      if (getAllCategories) return;
      navigate({ filters });
    },
    [getAllCategories, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllCategories) return;
    navigate({
      filters: defaultCategoryFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllCategories, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("categories_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
    categories: data?.documents || [],
    totalItems: data?.total || 0,
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    isLoading: isLoading || isPending,
    refetch: refetch,
    isFetching,
    error,
    setPage,
    setPageSize,
    setSearch,
    filters: currentState.filters,
    setFilters,
    clearFilters,
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
