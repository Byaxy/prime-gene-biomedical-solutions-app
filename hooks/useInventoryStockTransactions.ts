"use client";

import { useCallback, useEffect, useMemo, useTransition } from "react";
import { getInventoryTransactions } from "@/lib/actions/inventoryStock.actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InventoryTransactionWithRelations } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface UseInventoryStockOptions {
  getAllTransactions?: boolean;
  initialData?: {
    documents: InventoryTransactionWithRelations[];
    total: number;
  };
}

export interface InventoryTransactionsFilters {
  search?: string;
  productId?: string;
  storeId?: string;
  transactionType?: string;
  transactionDate_start?: string;
  transactionDate_end?: string;
}

export const defaultTransactionFilters: InventoryTransactionsFilters = {
  search: "",
  productId: undefined,
  storeId: undefined,
  transactionType: undefined,
  transactionDate_start: undefined,
  transactionDate_end: undefined,
};

export const useInventoryStockTransactions = ({
  getAllTransactions = false,
  initialData,
}: UseInventoryStockOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllTransactions) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: InventoryTransactionsFilters = {
      search: search || undefined,
      productId: searchParams.get("productId") || undefined,
      storeId: searchParams.get("storeId") || undefined,
      transactionType: searchParams.get("transactionType") || undefined,
      transactionDate_start: searchParams.get("startDate") || undefined,
      transactionDate_end: searchParams.get("endDate") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllTransactions, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["inventory-transactions", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getInventoryTransactions(
        page,
        pageSize,
        getAllTransactions || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllTransactions ? 60000 : 30000,
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
        filters: Partial<InventoryTransactionsFilters>;
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
        Object.keys(defaultTransactionFilters).forEach((key) =>
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
      const newFilters: InventoryTransactionsFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "inventory-transactions",
        newPage,
        newPageSize,
        newFilters,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getInventoryTransactions(
            newPage,
            newPageSize,
            newPageSize === 0,
            newFilters
          ),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllTransactions) return;
      navigate({ page });
    },
    [getAllTransactions, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllTransactions) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllTransactions, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllTransactions) return;
      navigate({ search });
    },
    [getAllTransactions, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<InventoryTransactionsFilters>) => {
      if (getAllTransactions) return;
      navigate({ filters });
    },
    [getAllTransactions, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllTransactions) return;
    navigate({
      filters: defaultTransactionFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllTransactions, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("inventory_transactions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_transactions",
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["inventory-transactions"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    inventoryTransactions: data?.documents || [],
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
    refetch: refetch,
  };
};
