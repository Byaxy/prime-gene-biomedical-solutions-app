"use client";

import { useCallback, useEffect, useMemo, useTransition } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getBackorders,
  fulfillSingleBackorder,
  BackorderFilters,
  softDeleteBackorder,
} from "@/lib/actions/backorder.actions";
import { BackorderWithRelations } from "@/types";

interface UseBackordersOptions {
  getAllBackorders?: boolean;
  initialData?: { documents: BackorderWithRelations[]; total: number };
}

export const defaultBackorderFilters: BackorderFilters = {
  search: undefined,
  productId: undefined,
  saleId: undefined,
  customerId: undefined,
  pendingQuantity_min: undefined,
  pendingQuantity_max: undefined,
  createdAt_start: undefined,
  createdAt_end: undefined,
};

export const useBackorders = ({
  getAllBackorders = false,
  initialData,
}: UseBackordersOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllBackorders) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
        filters: {
          ...defaultBackorderFilters,
          isActive: true,
        } as BackorderFilters,
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: BackorderFilters = {
      search: search || undefined,
      productId: searchParams.get("productId") || undefined,
      saleId: searchParams.get("saleId") || undefined,
      customerId: searchParams.get("customerId") || undefined,
      pendingQuantity_min: searchParams.get("pendingQuantity_min")
        ? Number(searchParams.get("pendingQuantity_min"))
        : undefined,
      pendingQuantity_max: searchParams.get("pendingQuantity_max")
        ? Number(searchParams.get("pendingQuantity_max"))
        : undefined,
      createdAt_start: searchParams.get("createdAt_start") || undefined,
      createdAt_end: searchParams.get("createdAt_end") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllBackorders, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["backorders", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getBackorders(
        page,
        pageSize,
        getAllBackorders || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllBackorders ? 60000 : 30000,
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
        filters: Partial<BackorderFilters>;
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
        Object.keys(defaultBackorderFilters).forEach((key) =>
          params.delete(key)
        );

        Object.entries(updates.filters).forEach(([key, value]) => {
          if (typeof value === "boolean") {
            params.set(key, String(value));
          } else if (value === undefined || value === "" || value === null) {
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
      const newFilters: BackorderFilters = {
        search: newParams.get("search") || undefined,
        productId: newParams.get("productId") || undefined,
        saleId: newParams.get("saleId") || undefined,
        customerId: newParams.get("customerId") || undefined,

        pendingQuantity_min: newParams.get("pendingQuantity_min")
          ? Number(newParams.get("pendingQuantity_min"))
          : undefined,
        pendingQuantity_max: newParams.get("pendingQuantity_max")
          ? Number(newParams.get("pendingQuantity_max"))
          : undefined,
        createdAt_start: newParams.get("createdAt_start") || undefined,
        createdAt_end: newParams.get("createdAt_end") || undefined,
      };

      const newQueryKey = [
        "backorders",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getBackorders(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllBackorders) return;
      navigate({ page });
    },
    [getAllBackorders, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllBackorders) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllBackorders, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllBackorders) return;
      navigate({ search });
    },
    [getAllBackorders, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<BackorderFilters>) => {
      if (getAllBackorders) return;
      navigate({ filters });
    },
    [getAllBackorders, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllBackorders) return;
    navigate({
      filters: defaultBackorderFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllBackorders, navigate]);

  // Real-time updates for backorders, inventory, sale items, and sales
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const backordersChannel = supabase
      .channel("backorders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "backorders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["backorders"] });
          router.refresh(); // Refresh route to re-fetch server components if any
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory", // Changes in inventory can affect available stock for backorders
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["backorders"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sale_items", // Changes in sale items directly affect backorder quantities
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["backorders"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales", // Changes in sales can affect related backorder context
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["backorders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(backordersChannel);
    };
  }, [queryClient, router]);

  // Fulfill backorder mutation
  const { mutate: fulfillBackorderMutation, status: fulfillBackorderStatus } =
    useMutation({
      mutationFn: async ({
        backorderId,
        inventoryStockId,
        userId,
        quantityToFulfill,
      }: {
        backorderId: string;
        inventoryStockId: string;
        userId: string;
        quantityToFulfill?: number;
      }) => {
        return fulfillSingleBackorder(
          backorderId,
          inventoryStockId,
          userId,
          quantityToFulfill
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["backorders"] });
      },
    });

  const {
    mutate: softDeleteBackorderMutation,
    status: softDeleteBackorderStatus,
  } = useMutation({
    mutationFn: async (backorderId: string) => {
      return softDeleteBackorder(backorderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backorders"] });
    },
  });

  return {
    backorders: data?.documents || [],
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
    fulfillBackorder: fulfillBackorderMutation,
    isFulfillingBackorder: fulfillBackorderStatus === "pending",
    softDeleteBackorder: softDeleteBackorderMutation,
    isSoftDeletingBackorder: softDeleteBackorderStatus === "pending",
  };
};
