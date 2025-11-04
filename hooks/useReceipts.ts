/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createReceipt,
  getReceipts,
  getReceiptById,
  updateReceipt,
  softDeleteReceipt,
} from "@/lib/actions/receipts.actions"; // Assuming this is where your actions are
import { ReceiptFilters, ReceiptFormValues } from "@/lib/validation"; // Assuming ReceiptFormValues is defined here
import { ReceiptWithRelations } from "@/types"; // Import necessary types

export const defaultReceiptFilters: ReceiptFilters = {
  search: undefined,
  customerId: undefined,
  receiptDate_start: undefined,
  receiptDate_end: undefined,
  amount_min: undefined,
  amount_max: undefined,
};

interface UseReceiptsOptions {
  getAllReceipts?: boolean;
  initialData?: { documents: ReceiptWithRelations[]; total: number };
}

export const useReceipts = ({
  getAllReceipts = false,
  initialData,
}: UseReceiptsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllReceipts) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
        filters: defaultReceiptFilters,
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    // Parse filters from URL
    const filters: ReceiptFilters = {
      search: search || undefined,
      customerId: searchParams.get("customerId") || undefined,
      receiptDate_start: searchParams.get("receiptDate_start") || undefined,
      receiptDate_end: searchParams.get("receiptDate_end") || undefined,
      amount_min: searchParams.get("amount_min")
        ? Number(searchParams.get("amount_min"))
        : undefined,
      amount_max: searchParams.get("amount_max")
        ? Number(searchParams.get("amount_max"))
        : undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllReceipts, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["receipts", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      // getReceipts signature: (page, limit, getAll, filters)
      return getReceipts(
        page,
        pageSize,
        getAllReceipts || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllReceipts ? 60000 * 5 : 30000, // 5 minutes for all, 30 seconds otherwise
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
        filters: Partial<ReceiptFilters>;
      }>
    ) => {
      const params = new URLSearchParams(searchParams.toString());

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
        // Clear all existing filter params first
        Object.keys(defaultReceiptFilters).forEach((key) => params.delete(key));
        Object.entries(updates.filters).forEach(([key, value]) => {
          if (
            value === undefined ||
            value === "" ||
            value === null ||
            value === "all"
          ) {
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

      // Prefetch the new data for smoother UX
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: ReceiptFilters = {
        search: newParams.get("search") || undefined,
        customerId: newParams.get("customerId") || undefined,
        receiptDate_start: newParams.get("receiptDate_start") || undefined,
        receiptDate_end: newParams.get("receiptDate_end") || undefined,
        amount_min: newParams.get("amount_min")
          ? Number(newParams.get("amount_min"))
          : undefined,
        amount_max: newParams.get("amount_max")
          ? Number(newParams.get("amount_max"))
          : undefined,
      };

      const newQueryKey = [
        "receipts",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getReceipts(
            newPage,
            newPageSize,
            getAllReceipts || newPageSize === 0,
            newFilters
          ),
      });
    },
    [searchParams, queryClient, router, getAllReceipts]
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
    (filters: Partial<ReceiptFilters>) => {
      navigate({ filters });
    },
    [navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultReceiptFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [navigate]);

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("receipts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "receipts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["receipts"] });
          queryClient.invalidateQueries({ queryKey: ["income"] });
          queryClient.invalidateQueries({ queryKey: ["incomeTracker"] });
          queryClient.invalidateQueries({ queryKey: ["incomeTrackerSummary"] });
        }
      )
      .subscribe();

    const receiptItemsChannel = supabase
      .channel("receipt_items_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "receipt_items",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["receipts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(receiptItemsChannel);
    };
  }, [queryClient]);

  // --- Mutations ---
  const { mutate: createReceiptMutation, status: createReceiptStatus } =
    useMutation({
      mutationFn: async ({ data }: { data: ReceiptFormValues }) =>
        createReceipt(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["receipts"] });
        queryClient.invalidateQueries({ queryKey: ["income"] });
      },
      onError: (error) => {
        console.error("Error creating Receipt:", error);
      },
    });

  const { mutate: updateReceiptMutation, status: updateReceiptStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: ReceiptFormValues;
      }) => updateReceipt(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["receipts"] });
        queryClient.invalidateQueries({ queryKey: ["income"] });
      },
      onError: (error) => {
        console.error("Error updating Receipt:", error);
      },
    });

  const { mutate: softDeleteReceiptMutation, status: softDeleteReceiptStatus } =
    useMutation({
      mutationFn: async ({ id }: { id: string }) => softDeleteReceipt(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["receipts"] });
        queryClient.invalidateQueries({ queryKey: ["income"] });
      },
      onError: (error) => {
        console.error("Error deactivating Receipt:", error);
      },
    });

  // Utility for fetching a single Receipt record by ID
  const useSingleReceipt = (id: string) => {
    return useQuery({
      queryKey: ["receipts", id],
      queryFn: () => getReceiptById(id),
      enabled: !!id,
      staleTime: 60000,
      refetchOnWindowFocus: false,
    });
  };

  return {
    receipts: data?.documents || [],
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
    createReceipt: createReceiptMutation,
    isCreatingReceipt: createReceiptStatus === "pending",
    updateReceipt: updateReceiptMutation,
    isUpdatingReceipt: updateReceiptStatus === "pending",
    softDeleteReceipt: softDeleteReceiptMutation,
    isSoftDeletingReceipt: softDeleteReceiptStatus === "pending",
    // Single fetch utility
    useSingleReceipt,
  };
};
