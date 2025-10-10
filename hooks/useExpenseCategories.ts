"use client";

import {
  addExpenseCategory,
  getExpenseCategories,
  getExpenseCategoryById,
  softDeleteExpenseCategory,
  updateExpenseCategory,
} from "@/lib/actions/expenseCategories.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ExpenseCategoryFilters,
  ExpenseCategoryFormValues,
} from "@/lib/validation";
import { ExpenseCategoryWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseExpenseCategoriesOptions {
  getAllCategories?: boolean;
  initialData?: { documents: ExpenseCategoryWithRelations[]; total: number };
}

export const defaultExpenseCategoryFilters: ExpenseCategoryFilters = {
  search: undefined,
  parentId: undefined,
  chartOfAccountsId: undefined,
};

export const useExpenseCategories = ({
  getAllCategories = false,
  initialData,
}: UseExpenseCategoriesOptions = {}) => {
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

    const filters: ExpenseCategoryFilters = {
      search: search || undefined,
      parentId: searchParams.get("parentId") || undefined,
      chartOfAccountsId: searchParams.get("chartOfAccountsId") || undefined,
    };

    return {
      page,
      pageSize,
      filters,
      search,
    };
  }, [getAllCategories, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["expenseCategories", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getExpenseCategories(
        page,
        pageSize,
        getAllCategories || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllCategories ? 60000 * 5 : 30000,
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
        filters: Partial<ExpenseCategoryFilters>;
      }>
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.page !== undefined) {
        params.set("page", String(updates.page === 0 ? "" : updates.page));
      }
      if (updates.pageSize !== undefined) {
        params.set(
          "pageSize",
          String(updates.pageSize === 10 ? "" : updates.pageSize)
        );
        params.delete("page");
      }
      if (updates.search !== undefined) {
        params.set("search", updates.search.trim() || "");
        params.delete("page");
      }

      if (updates.filters) {
        Object.keys(defaultExpenseCategoryFilters).forEach((key) =>
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

      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });

      // Prefetch the new data
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: ExpenseCategoryFilters = {
        search: newParams.get("search") || undefined,
        parentId: newParams.get("parentId") || undefined,
        chartOfAccountsId: newParams.get("chartOfAccountsId") || undefined,
      };

      const newQueryKey = [
        "expenseCategories",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getExpenseCategories(
            newPage,
            newPageSize,
            getAllCategories || newPageSize === 0,
            newFilters
          ),
      });
    },
    [searchParams, queryClient, router, getAllCategories]
  );

  const setPage = useCallback(
    (page: number) => {
      navigate({ page });
    },
    [navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      navigate({ pageSize, page: 0 });
    },
    [navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      navigate({ search });
    },
    [navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<ExpenseCategoryFilters>) => {
      navigate({ filters });
    },
    [navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultExpenseCategoryFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [navigate]);

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("expense_categories_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expense_categories",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          queryClient.invalidateQueries({
            queryKey: ["accompanyingExpenseTypes"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // --- Mutations ---
  const {
    mutate: addExpenseCategoryMutation,
    status: addExpenseCategoryStatus,
  } = useMutation({
    mutationFn: async (data: ExpenseCategoryFormValues) =>
      addExpenseCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
    },
    onError: (error) => {
      console.error("Error adding Expense Category:", error);
    },
  });

  const {
    mutate: updateExpenseCategoryMutation,
    status: updateExpenseCategoryStatus,
  } = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ExpenseCategoryFormValues>;
    }) => updateExpenseCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
    },
    onError: (error) => {
      console.error("Error updating Expense Category:", error);
    },
  });

  const {
    mutate: softDeleteExpenseCategoryMutation,
    status: softDeleteExpenseCategoryStatus,
  } = useMutation({
    mutationFn: async (id: string) => softDeleteExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
    },
    onError: (error) => {
      console.error("Error deactivating Expense Category:", error);
    },
  });

  // Utility for fetching a single Expense Category by ID
  const useSingleExpenseCategory = (id: string) => {
    return useQuery({
      queryKey: ["expenseCategories", id],
      queryFn: () => getExpenseCategoryById(id),
      enabled: !!id,
      staleTime: 60000,
    });
  };

  return {
    expenseCategories: data?.documents || [],
    totalItems: data?.total || 0,
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    filters: currentState.filters,
    isLoading: isLoading || isPending,
    isFetching,
    error,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetch,
    addExpenseCategory: addExpenseCategoryMutation,
    isAddingExpenseCategory: addExpenseCategoryStatus === "pending",
    updateExpenseCategory: updateExpenseCategoryMutation,
    isUpdatingExpenseCategory: updateExpenseCategoryStatus === "pending",
    softDeleteExpenseCategory: softDeleteExpenseCategoryMutation,
    isSoftDeletingExpenseCategory:
      softDeleteExpenseCategoryStatus === "pending",
    useSingleExpenseCategory,
  };
};
