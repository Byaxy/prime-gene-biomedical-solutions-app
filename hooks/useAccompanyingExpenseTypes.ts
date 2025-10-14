/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  addAccompanyingExpenseType,
  getAccompanyingExpenseTypeById,
  getAccompanyingExpenseTypes,
  softDeleteAccompanyingExpenseType,
  updateAccompanyingExpenseType,
} from "@/lib/actions/accompanyingExpenses.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AccompanyingExpenseTypeFilters,
  AccompanyingExpenseTypeFormValues,
} from "@/lib/validation";
import { AccompanyingExpenseTypeWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseAccompanyingExpenseTypesOptions {
  getAllTypes?: boolean;
  initialData?: {
    documents: AccompanyingExpenseTypeWithRelations[];
    total: number;
  };
}

export const defaultAccompanyingExpenseTypeFilters: AccompanyingExpenseTypeFilters =
  {
    search: undefined,
  };

export const useAccompanyingExpenseTypes = ({
  getAllTypes = false,
  initialData,
}: UseAccompanyingExpenseTypesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL
  const currentState = useMemo(() => {
    if (getAllTypes) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
        filters: defaultAccompanyingExpenseTypeFilters,
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: AccompanyingExpenseTypeFilters = {
      search: search || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllTypes, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["accompanyingExpenseTypes", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;

      return getAccompanyingExpenseTypes(
        page,
        pageSize,
        getAllTypes || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllTypes ? 60000 * 5 : 30000,
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
        filters: Partial<AccompanyingExpenseTypeFilters>;
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
        Object.keys(defaultAccompanyingExpenseTypeFilters).forEach((key) =>
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

      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);

      const newFilters: AccompanyingExpenseTypeFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "accompanyingExpenseTypes",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getAccompanyingExpenseTypes(
            newPage,
            newPageSize,
            getAllTypes || newPageSize === 0,
            newFilters
          ),
      });
    },
    [searchParams, queryClient, router, getAllTypes]
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
    (filters: Partial<AccompanyingExpenseTypeFilters>) => {
      navigate({ filters });
    },
    [navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultAccompanyingExpenseTypeFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [navigate]);

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("accompanying_expense_types_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accompanying_expense_types",
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["accompanyingExpenseTypes"],
          });
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          queryClient.invalidateQueries({ queryKey: ["billPayments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // --- Mutations ---
  const {
    mutate: addAccompanyingExpenseTypeMutation,
    status: addAccompanyingExpenseTypeStatus,
  } = useMutation({
    mutationFn: async (data: AccompanyingExpenseTypeFormValues) =>
      addAccompanyingExpenseType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accompanyingExpenseTypes"] });
    },
    onError: (error) => {
      console.error("Error adding Accompanying Expense Type:", error);
    },
  });

  const {
    mutate: updateAccompanyingExpenseTypeMutation,
    status: updateAccompanyingExpenseTypeStatus,
  } = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AccompanyingExpenseTypeFormValues>;
    }) => updateAccompanyingExpenseType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accompanyingExpenseTypes"] });
    },
    onError: (error) => {
      console.error("Error updating Accompanying Expense Type:", error);
    },
  });

  const {
    mutate: softDeleteAccompanyingExpenseTypeMutation,
    status: softDeleteAccompanyingExpenseTypeStatus,
  } = useMutation({
    mutationFn: async (id: string) => softDeleteAccompanyingExpenseType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accompanyingExpenseTypes"] });
    },
    onError: (error) => {
      console.error("Error deactivating Accompanying Expense Type:", error);
    },
  });

  // Utility for fetching a single Accompanying Expense Type by ID
  const useSingleAccompanyingExpenseType = (id: string) => {
    return useQuery({
      queryKey: ["accompanyingExpenseTypes", id],
      queryFn: () => getAccompanyingExpenseTypeById(id),
      enabled: !!id,
      staleTime: 60000,
    });
  };

  return {
    accompanyingExpenseTypes: data?.documents || [],
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
    // Mutations
    addAccompanyingExpenseType: addAccompanyingExpenseTypeMutation,
    isAddingAccompanyingExpenseType:
      addAccompanyingExpenseTypeStatus === "pending",
    updateAccompanyingExpenseType: updateAccompanyingExpenseTypeMutation,
    isUpdatingAccompanyingExpenseType:
      updateAccompanyingExpenseTypeStatus === "pending",
    softDeleteAccompanyingExpenseType:
      softDeleteAccompanyingExpenseTypeMutation,
    isSoftDeletingAccompanyingExpenseType:
      softDeleteAccompanyingExpenseTypeStatus === "pending",
    // Single fetch utility
    useSingleAccompanyingExpenseType,
  };
};
