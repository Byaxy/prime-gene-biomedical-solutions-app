/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import {
  getIncomeTrackerData,
  getIncomeTrackerSummary,
} from "@/lib/actions/payments.actions";
import { IncomeTrackerFilters } from "@/lib/validation";
import { IncomeTrackerRecord, IncomeTrackerSummary } from "@/types";

interface UseIncomeTrackerOptions {
  initialData?: {
    documents: IncomeTrackerRecord[];
    total: number;
    summary: IncomeTrackerSummary;
  };
}

export const defaultIncomeTrackerFilters: IncomeTrackerFilters = {
  search: undefined,
  customerId: undefined,
  saleId: undefined,
  status: "all",
  dateRange: "all",
  specificDate_start: undefined,
  specificDate_end: undefined,
  paymentMethod: undefined,
  amount_min: undefined,
  amount_max: undefined,
};

export const useIncomeTracker = ({
  initialData,
}: UseIncomeTrackerOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL
  const currentState = useMemo(() => {
    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    // Parse filters from URL
    const filters: IncomeTrackerFilters = {
      search: search || undefined,
      customerId: searchParams.get("customerId") || undefined,
      saleId: searchParams.get("saleId") || undefined,
      status: (searchParams.get("status") as any) || undefined,
      dateRange: (searchParams.get("dateRange") as any) || undefined,
      specificDate_start: searchParams.get("specificDate_start") || undefined,
      specificDate_end: searchParams.get("specificDate_end") || undefined,
      paymentMethod: (searchParams.get("paymentMethod") as any) || undefined,
      amount_min: searchParams.get("amount_min")
        ? Number(searchParams.get("amount_min"))
        : undefined,
      amount_max: searchParams.get("amount_max")
        ? Number(searchParams.get("amount_max"))
        : undefined,
    };

    return { page, pageSize, filters, search };
  }, [searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["incomeTracker", page, pageSize, filterString];
  }, [currentState]);

  // Summary query key
  const summaryQueryKey = useMemo(() => {
    const { filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["incomeTrackerSummary", filterString];
  }, [currentState]);

  // Main query for income tracker data
  const {
    data: trackerData,
    isLoading: isLoadingTracker,
    isFetching: isFetchingTracker,
    error: trackerError,
    refetch: refetchTracker,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getIncomeTrackerData(page, pageSize, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Summary query
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    isFetching: isFetchingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: async () => {
      const { filters } = currentState;
      return getIncomeTrackerSummary(filters);
    },
    staleTime: 30000,
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
        filters: Partial<IncomeTrackerFilters>;
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
        Object.keys(defaultIncomeTrackerFilters).forEach((key) =>
          params.delete(key)
        );
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

      // Prefetch the new data
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: IncomeTrackerFilters = {
        search: newParams.get("search") || undefined,
        customerId: newParams.get("customerId") || undefined,
        saleId: newParams.get("saleId") || undefined,
        status: (newParams.get("status") as any) || undefined,
        dateRange: (newParams.get("dateRange") as any) || undefined,
        specificDate_start: newParams.get("specificDate_start") || undefined,
        specificDate_end: newParams.get("specificDate_end") || undefined,
        paymentMethod: (newParams.get("paymentMethod") as any) || undefined,
        amount_min: newParams.get("amount_min")
          ? Number(newParams.get("amount_min"))
          : undefined,
        amount_max: newParams.get("amount_max")
          ? Number(newParams.get("amount_max"))
          : undefined,
      };

      const newQueryKey = [
        "incomeTracker",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () => getIncomeTrackerData(newPage, newPageSize, newFilters),
      });

      // Prefetch summary
      queryClient.prefetchQuery({
        queryKey: ["incomeTrackerSummary", JSON.stringify(newFilters)],
        queryFn: () => getIncomeTrackerSummary(newFilters),
      });
    },
    [searchParams, queryClient, router]
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
    (filters: Partial<IncomeTrackerFilters>) => {
      navigate({ filters });
    },
    [navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultIncomeTrackerFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [navigate]);

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const salesChannel = supabase
      .channel("sales_changes_tracker")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["incomeTracker"] });
          queryClient.invalidateQueries({ queryKey: ["incomeTrackerSummary"] });
        }
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel("payments_received_changes_tracker")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments_received",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["incomeTracker"] });
          queryClient.invalidateQueries({ queryKey: ["incomeTrackerSummary"] });
          // Also invalidate related queries
          queryClient.invalidateQueries({ queryKey: ["income"] });
          queryClient.invalidateQueries({ queryKey: ["sales"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [queryClient]);

  // Refetch all data
  const refetchAll = useCallback(async () => {
    await Promise.all([refetchTracker(), refetchSummary()]);
  }, [refetchTracker, refetchSummary]);

  return {
    // Data
    incomeTrackerRecords: trackerData?.documents || [],
    totalItems: trackerData?.total || 0,
    summary: summaryData || trackerData?.summary || null,

    // Pagination state
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    filters: currentState.filters,

    // Loading states
    isLoading: isLoadingTracker || isLoadingSummary || isPending,
    isFetching: isFetchingTracker || isFetchingSummary,
    isLoadingTracker,
    isLoadingSummary,
    isFetchingTracker,
    isFetchingSummary,

    // Error states
    error: trackerError || summaryError,
    trackerError,
    summaryError,

    // Actions
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetch: refetchAll,
    refetchTracker,
    refetchSummary,
  };
};

// Additional hook for income tracker summary only (useful for dashboard widgets)
export const useIncomeTrackerSummary = (
  filters?: Partial<IncomeTrackerFilters>
) => {
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => {
    const filterString = JSON.stringify(filters || {});
    return ["incomeTrackerSummary", filterString];
  }, [filters]);

  const {
    data: summaryData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => getIncomeTrackerSummary(filters),
    staleTime: 60000, // 1 minute for dashboard widgets
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("income_tracker_summary_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["incomeTrackerSummary"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments_received",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["incomeTrackerSummary"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    summary: summaryData || null,
    isLoading,
    isFetching,
    error,
    refetch,
  };
};
