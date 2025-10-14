"use client";

import {
  addIncomeCategory,
  getIncomeCategories,
  getIncomeCategoryById,
  softDeleteIncomeCategory,
  updateIncomeCategory,
} from "@/lib/actions/incomeCategories.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  IncomeCategoryFilters,
  IncomeCategoryFormValues,
} from "@/lib/validation";
import { IncomeCategoryWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseIncomeCategoriesOptions {
  getAllCategories?: boolean;
  initialData?: { documents: IncomeCategoryWithRelations[]; total: number };
}

export const defaultIncomeCategoryFilters: IncomeCategoryFilters = {
  search: undefined,
  chartOfAccountsId: undefined,
};

export const useIncomeCategories = ({
  getAllCategories = false,
  initialData,
}: UseIncomeCategoriesOptions = {}) => {
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

    const filters: IncomeCategoryFilters = {
      search: search || undefined,
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
    return ["incomeCategories", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getIncomeCategories(
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
        filters: Partial<IncomeCategoryFilters>;
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
        if (updates.search.trim()) {
          params.set("search", updates.search.trim());
        } else {
          params.delete("search");
        }
        params.delete("page");
      }

      if (updates.filters) {
        Object.keys(defaultIncomeCategoryFilters).forEach((key) =>
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
      const newFilters: IncomeCategoryFilters = {
        search: newParams.get("search") || undefined,
        chartOfAccountsId: newParams.get("chartOfAccountsId") || undefined,
      };

      const newQueryKey = [
        "incomeCategories",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getIncomeCategories(
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
    (filters: Partial<IncomeCategoryFilters>) => {
      navigate({ filters });
    },
    [navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultIncomeCategoryFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [navigate]);

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("income_categories_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "income_categories",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["incomeCategories"] });
          queryClient.invalidateQueries({ queryKey: ["sales"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // --- Mutations ---
  const { mutate: addIncomeCategoryMutation, status: addIncomeCategoryStatus } =
    useMutation({
      mutationFn: async (data: IncomeCategoryFormValues) =>
        addIncomeCategory(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["incomeCategories"] });
      },
      onError: (error) => {
        console.error("Error adding Income Category:", error);
      },
    });

  const {
    mutate: updateIncomeCategoryMutation,
    status: updateIncomeCategoryStatus,
  } = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<IncomeCategoryFormValues>;
    }) => updateIncomeCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomeCategories"] });
    },
    onError: (error) => {
      console.error("Error updating Income Category:", error);
    },
  });

  const {
    mutate: softDeleteIncomeCategoryMutation,
    status: softDeleteIncomeCategoryStatus,
  } = useMutation({
    mutationFn: async (id: string) => softDeleteIncomeCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomeCategories"] });
    },
    onError: (error) => {
      console.error("Error deactivating Income Category:", error);
    },
  });

  // Utility for fetching a single Income Category by ID
  const useSingleIncomeCategory = (id: string) => {
    return useQuery({
      queryKey: ["incomeCategories", id],
      queryFn: () => getIncomeCategoryById(id),
      enabled: !!id,
      staleTime: 60000,
    });
  };

  return {
    incomeCategories: data?.documents || [],
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
    addIncomeCategory: addIncomeCategoryMutation,
    isAddingIncomeCategory: addIncomeCategoryStatus === "pending",
    updateIncomeCategory: updateIncomeCategoryMutation,
    isUpdatingIncomeCategory: updateIncomeCategoryStatus === "pending",
    softDeleteIncomeCategory: softDeleteIncomeCategoryMutation,
    isSoftDeletingIncomeCategory: softDeleteIncomeCategoryStatus === "pending",
    useSingleIncomeCategory,
  };
};
