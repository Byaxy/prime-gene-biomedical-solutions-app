"use client";

import { useCallback, useEffect, useMemo, useTransition } from "react";
import {
  addInventoryStock,
  adjustInventoryStock,
  getInventoryStock,
} from "@/lib/actions/inventoryStock.actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExtendedStockAdjustmentFormValues } from "@/components/forms/NewStockForm";
import { ExistingStockAdjustmentFormValues } from "@/lib/validation";
import { InventoryStockWithRelations } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface UseInventoryStockOptions {
  getAllInventoryStocks?: boolean;
  initialData?: { documents: InventoryStockWithRelations[]; total: number };
}
export interface InventoryStockFilters {
  search?: string;
  quantity_min?: number;
  quantity_max?: number;
  costPrice_min?: number;
  costPrice_max?: number;
  sellingPrice_min?: number;
  sellingPrice_max?: number;
  expiryDate_start?: string;
  expiryDate_end?: string;
  manufactureDate_start?: string;
  manufactureDate_end?: string;
  store?: string;
}

export const defaultInventoryStockFilters: InventoryStockFilters = {
  search: "",
  quantity_min: undefined,
  quantity_max: undefined,
  costPrice_min: undefined,
  costPrice_max: undefined,
  sellingPrice_min: undefined,
  sellingPrice_max: undefined,
  expiryDate_start: undefined,
  expiryDate_end: undefined,
  manufactureDate_start: undefined,
  manufactureDate_end: undefined,
  store: undefined,
};

export const useInventoryStock = ({
  getAllInventoryStocks = false,
  initialData,
}: UseInventoryStockOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllInventoryStocks) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: InventoryStockFilters = {
      search: search || undefined,
      costPrice_min: searchParams.get("costPrice_min")
        ? Number(searchParams.get("costPrice_min"))
        : undefined,
      costPrice_max: searchParams.get("costPrice_max")
        ? Number(searchParams.get("costPrice_max"))
        : undefined,
      sellingPrice_min: searchParams.get("sellingPrice_min")
        ? Number(searchParams.get("sellingPrice_min"))
        : undefined,
      sellingPrice_max: searchParams.get("sellingPrice_max")
        ? Number(searchParams.get("sellingPrice_max"))
        : undefined,
      quantity_min: searchParams.get("quantity_min")
        ? Number(searchParams.get("quantity_min"))
        : undefined,
      quantity_max: searchParams.get("quantity_max")
        ? Number(searchParams.get("quantity_max"))
        : undefined,
      expiryDate_start: searchParams.get("expiryDate_start") || undefined,
      expiryDate_end: searchParams.get("expiryDate_end") || undefined,
      manufactureDate_start:
        searchParams.get("manufactureDate_start") || undefined,
      manufactureDate_end: searchParams.get("manufactureDate_end") || undefined,
      store: searchParams.get("store") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllInventoryStocks, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["inventory-stock", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getInventoryStock(
        page,
        pageSize,
        getAllInventoryStocks || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllInventoryStocks ? 60000 : 30000,
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
        filters: Partial<InventoryStockFilters>;
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
        Object.keys(defaultInventoryStockFilters).forEach((key) =>
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
      const newFilters: InventoryStockFilters = {
        search: newParams.get("search") || undefined,
      };

      const newQueryKey = [
        "inventory-stock",
        newPage,
        newPageSize,
        newFilters,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getInventoryStock(
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
      if (getAllInventoryStocks) return;
      navigate({ page });
    },
    [getAllInventoryStocks, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllInventoryStocks) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllInventoryStocks, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllInventoryStocks) return;
      navigate({ search });
    },
    [getAllInventoryStocks, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<InventoryStockFilters>) => {
      if (getAllInventoryStocks) return;
      navigate({ filters });
    },
    [getAllInventoryStocks, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllInventoryStocks) return;
    navigate({
      filters: defaultInventoryStockFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllInventoryStocks, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("inventory_stock_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Add inventory stock mutation
  const {
    mutateAsync: addInventoryStockMutation,
    status: addInventoryStockStatus,
  } = useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: ExtendedStockAdjustmentFormValues;
      userId: string;
    }) => {
      const result = await addInventoryStock(data, userId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
    },
  });

  // Adjust inventory stock mutation
  const {
    mutateAsync: adjustInventoryStockMutation,
    status: adjustInventoryStockStatus,
  } = useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: ExistingStockAdjustmentFormValues;
      userId: string;
    }) => {
      const result = await adjustInventoryStock(data, userId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "inventory-stock",
          "inventory-transactions",
          "allTransactions",
          "paginatedInventoryStock",
        ],
      });
    },
  });

  return {
    inventoryStock: data?.documents || [],
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
    addInventoryStock: addInventoryStockMutation,
    isAddingInventoryStock: addInventoryStockStatus === "pending",
    adjustInventoryStock: adjustInventoryStockMutation,
    isAdjustingInventoryStock: adjustInventoryStockStatus === "pending",
  };
};
