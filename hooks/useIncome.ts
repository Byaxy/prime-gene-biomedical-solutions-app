/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { IncomeFormValues, IncomeFilters } from "@/lib/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { IncomeWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import {
  getIncome,
  getIncomeById,
  recordIncome,
  softDeleteIncome,
  updateIncome,
} from "@/lib/actions/payments.actions";

interface UseIncomeOptions {
  getAllIncome?: boolean;
  initialData?: { documents: IncomeWithRelations[]; total: number };
}

export const defaultIncomeFilters: IncomeFilters = {
  search: undefined,
  customerId: undefined,
  saleId: undefined,
  incomeCategoryId: undefined,
  receivingAccountId: undefined,
  paymentMethod: undefined,
  paymentDate_start: undefined,
  paymentDate_end: undefined,
  amount_min: undefined,
  amount_max: undefined,
};

export const useIncome = ({
  getAllIncome = false,
  initialData,
}: UseIncomeOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL
  const currentState = useMemo(() => {
    if (getAllIncome) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
        filters: defaultIncomeFilters,
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    // Parse filters from URL
    const filters: IncomeFilters = {
      search: search || undefined,
      customerId: searchParams.get("customerId") || undefined,
      saleId: searchParams.get("saleId") || undefined,
      incomeCategoryId: searchParams.get("incomeCategoryId") || undefined,
      receivingAccountId: searchParams.get("receivingAccountId") || undefined,
      paymentMethod: (searchParams.get("paymentMethod") as any) || undefined,
      paymentDate_start: searchParams.get("paymentDate_start") || undefined,
      paymentDate_end: searchParams.get("paymentDate_end") || undefined,
      amount_min: searchParams.get("amount_min")
        ? Number(searchParams.get("amount_min"))
        : undefined,
      amount_max: searchParams.get("amount_max")
        ? Number(searchParams.get("amount_max"))
        : undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllIncome, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["income", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      // getIncome signature: (page, limit, getAll, filters)
      return getIncome(page, pageSize, getAllIncome || pageSize === 0, filters);
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllIncome ? 60000 * 5 : 30000,
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
        filters: Partial<IncomeFilters>;
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
        Object.keys(defaultIncomeFilters).forEach((key) => params.delete(key));
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
      const newFilters: IncomeFilters = {
        search: newParams.get("search") || undefined,
        customerId: newParams.get("customerId") || undefined,
        saleId: newParams.get("saleId") || undefined,
        incomeCategoryId: newParams.get("incomeCategoryId") || undefined,
        receivingAccountId: newParams.get("receivingAccountId") || undefined,
        paymentMethod: (newParams.get("paymentMethod") as any) || undefined,
        paymentDate_start: newParams.get("paymentDate_start") || undefined,
        paymentDate_end: newParams.get("paymentDate_end") || undefined,
        amount_min: newParams.get("amount_min")
          ? Number(newParams.get("amount_min"))
          : undefined,
        amount_max: newParams.get("amount_max")
          ? Number(newParams.get("amount_max"))
          : undefined,
      };

      const newQueryKey = [
        "income",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getIncome(
            newPage,
            newPageSize,
            getAllIncome || newPageSize === 0,
            newFilters
          ),
      });
    },
    [searchParams, queryClient, router, getAllIncome]
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
    (filters: Partial<IncomeFilters>) => {
      navigate({ filters });
    },
    [navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultIncomeFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [navigate]);

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("payments_received_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments_received",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["income"] });
          // Invalidate related financial data
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // --- Mutations ---
  const { mutate: recordIncomeMutation, status: recordIncomeStatus } =
    useMutation({
      mutationFn: async ({
        data,
        userId,
      }: {
        data: IncomeFormValues;
        userId: string;
      }) => recordIncome(data, userId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["income"] });
      },
      onError: (error) => {
        console.error("Error recording Income:", error);
      },
    });

  const { mutate: updateIncomeMutation, status: updateIncomeStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
        userId,
      }: {
        id: string;
        data: IncomeFormValues;
        userId: string;
      }) => updateIncome(id, data, userId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["income"] });
      },
      onError: (error) => {
        console.error("Error updating Income:", error);
      },
    });

  const { mutate: softDeleteIncomeMutation, status: softDeleteIncomeStatus } =
    useMutation({
      mutationFn: async ({ id, userId }: { id: string; userId: string }) =>
        softDeleteIncome(id, userId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["income"] });
      },
      onError: (error) => {
        console.error("Error deactivating Income:", error);
      },
    });

  // Utility for fetching a single Income record by ID
  const useSingleIncome = (id: string) => {
    return useQuery({
      queryKey: ["income", id],
      queryFn: () => getIncomeById(id),
      enabled: !!id,
      staleTime: 60000,
    });
  };

  return {
    incomeRecords: data?.documents || [],
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
    recordIncome: recordIncomeMutation,
    isRecordingIncome: recordIncomeStatus === "pending",
    updateIncome: updateIncomeMutation,
    isUpdatingIncome: updateIncomeStatus === "pending",
    softDeleteIncome: softDeleteIncomeMutation,
    isSoftDeletingIncome: softDeleteIncomeStatus === "pending",
    // Single fetch utility
    useSingleIncome,
  };
};
