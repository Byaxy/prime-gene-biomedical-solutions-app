/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { BillPaymentFormValues, BillTrackerFilters } from "@/lib/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BillTrackerData } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import {
  getBillPaymentById,
  getBillTrackerData,
  payBill,
  softDeleteBillPayment,
  updateBillPayment,
} from "@/lib/actions/bills.actions";

interface UseBillPaymentsOptions {
  getAllBills?: boolean;
  initialData?: { documents: BillTrackerData[]; total: number };
}

export const defaultBillTrackerFilters: BillTrackerFilters = {
  search: undefined,
  vendorId: undefined,
  type: "all",
  status: "all",
  dateRange: "all",
  specificDate_start: undefined,
  specificDate_end: undefined,
};

export const useBillPayments = ({
  getAllBills = false,
  initialData,
}: UseBillPaymentsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL
  const currentState = useMemo(() => {
    if (getAllBills) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
        filters: defaultBillTrackerFilters,
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    // Parse filters from URL
    const filters: BillTrackerFilters = {
      search: search || undefined,
      vendorId: searchParams.get("vendorId") || undefined,
      type: (searchParams.get("type") as any) || defaultBillTrackerFilters.type,
      status:
        (searchParams.get("status") as any) || defaultBillTrackerFilters.status,
      dateRange:
        (searchParams.get("dateRange") as any) ||
        defaultBillTrackerFilters.dateRange,
      specificDate_start: searchParams.get("specificDate_start") || undefined,
      specificDate_end: searchParams.get("specificDate_end") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllBills, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["billPayments", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state (for the Bill Tracker List)
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getBillTrackerData(page, pageSize, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllBills ? 60000 * 5 : 30000,
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
        filters: Partial<BillTrackerFilters>;
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
        Object.keys(defaultBillTrackerFilters).forEach((key) =>
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
      const newFilters: BillTrackerFilters = {
        search: newParams.get("search") || undefined,
        vendorId: newParams.get("vendorId") || undefined,
        type: (newParams.get("type") as any) || defaultBillTrackerFilters.type,
        status:
          (newParams.get("status") as any) || defaultBillTrackerFilters.status,
        dateRange:
          (newParams.get("dateRange") as any) ||
          defaultBillTrackerFilters.dateRange,
        specificDate_start: newParams.get("specificDate_start") || undefined,
        specificDate_end: newParams.get("specificDate_end") || undefined,
      };

      const newQueryKey = [
        "billPayments",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () => getBillTrackerData(newPage, newPageSize, newFilters),
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
    (filters: Partial<BillTrackerFilters>) => {
      navigate({ filters });
    },
    [navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultBillTrackerFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [navigate]);

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Listen for changes in the bill_payments table
    const channel = supabase
      .channel("bill_payments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bill_payments",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["billPayments"] });
          queryClient.invalidateQueries({ queryKey: ["purchases"] });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // --- Mutations ---
  const { mutate: payBillMutation, status: payBillStatus } = useMutation({
    mutationFn: async (data: { data: BillPaymentFormValues; userId: string }) =>
      payBill(data.data, data.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billPayments"] });
    },
    onError: (error) => {
      console.error("Error recording Bill Payment:", error);
    },
  });

  const { mutate: updateBillPaymentMutation, status: updateBillPaymentStatus } =
    useMutation({
      mutationFn: async (data: {
        id: string;
        data: Partial<BillPaymentFormValues>;
        userId: string;
      }) => updateBillPayment(data.id, data.data, data.userId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["billPayments"] });
      },
      onError: (error) => {
        console.error("Error updating Bill Payment:", error);
      },
    });

  const {
    mutate: softDeleteBillPaymentMutation,
    status: softDeleteBillPaymentStatus,
  } = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) =>
      softDeleteBillPayment(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billPayments"] });
    },
    onError: (error) => {
      console.error("Error deactivating Bill Payment:", error);
    },
  });

  // Utility for fetching a single Bill Payment by ID (for dialog/edit form)
  const useSingleBillPayment = (id: string) => {
    return useQuery({
      queryKey: ["billPayments", id],
      queryFn: () => getBillPaymentById(id),
      enabled: !!id,
      staleTime: 60000,
    });
  };

  return {
    billPayments: data?.documents || [],
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
    payBill: payBillMutation,
    isPayingBill: payBillStatus === "pending",
    updateBillPayment: updateBillPaymentMutation,
    isUpdatingBillPayment: updateBillPaymentStatus === "pending",
    softDeleteBillPayment: softDeleteBillPaymentMutation,
    isSoftDeletingBillPayment: softDeleteBillPaymentStatus === "pending",
    // Single fetch utility
    useSingleBillPayment,
  };
};
