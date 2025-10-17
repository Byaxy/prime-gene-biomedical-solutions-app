"use client";

import {
  addExpense,
  getExpenseById,
  getExpenses,
  softDeleteExpense,
  updateExpense,
} from "@/lib/actions/expense.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ExpenseFormValues } from "@/lib/validation";
import { ExpenseWithRelations } from "@/types"; // Your ExpenseWithRelations type
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseExpensesOptions {
  getAllExpenses?: boolean;
  initialData?: { documents: ExpenseWithRelations[]; total: number };
}

export interface ExpenseFilters {
  search?: string;
  expenseCategoryId?: string;
  payingAccountId?: string;
  payee?: string;
  purchaseId?: string;
  accompanyingExpenseTypeId?: string;
  expenseDate_start?: string;
  expenseDate_end?: string;
  amount_min?: number;
  amount_max?: number;
}

export const defaultExpenseFilters: ExpenseFilters = {
  search: undefined,
  expenseCategoryId: undefined,
  payingAccountId: undefined,
  payee: undefined,
  purchaseId: undefined,
  accompanyingExpenseTypeId: undefined,
  expenseDate_start: undefined,
  expenseDate_end: undefined,
  amount_min: undefined,
  amount_max: undefined,
};

export const useExpenses = ({
  getAllExpenses = false,
  initialData,
}: UseExpensesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllExpenses) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: ExpenseFilters = {
      search: search || undefined,
      expenseCategoryId: searchParams.get("expenseCategoryId") || undefined,
      payingAccountId: searchParams.get("payingAccountId") || undefined,
      payee: searchParams.get("payee") || undefined,
      purchaseId: searchParams.get("purchaseId") || undefined,
      accompanyingExpenseTypeId:
        searchParams.get("accompanyingExpenseTypeId") || undefined,
      expenseDate_start: searchParams.get("expenseDate_start") || undefined,
      expenseDate_end: searchParams.get("expenseDate_end") || undefined,
      amount_min: searchParams.get("amount_min")
        ? Number(searchParams.get("amount_min"))
        : undefined,
      amount_max: searchParams.get("amount_max")
        ? Number(searchParams.get("amount_max"))
        : undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllExpenses, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["expenses", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getExpenses(
        page,
        pageSize,
        getAllExpenses || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllExpenses ? 60000 * 5 : 30000,
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
        filters: Partial<ExpenseFilters>;
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
        Object.keys(defaultExpenseFilters).forEach((key) => params.delete(key));
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
      const newFilters: ExpenseFilters = {
        search: newParams.get("search") || undefined,
        expenseCategoryId: newParams.get("expenseCategoryId") || undefined,
        payingAccountId: newParams.get("payingAccountId") || undefined,
        payee: newParams.get("payee") || undefined,
        purchaseId: newParams.get("purchaseId") || undefined,
        accompanyingExpenseTypeId:
          newParams.get("accompanyingExpenseTypeId") || undefined,
        expenseDate_start: newParams.get("expenseDate_start") || undefined,
        expenseDate_end: newParams.get("expenseDate_end") || undefined,
        amount_min: newParams.get("amount_min")
          ? Number(newParams.get("amount_min"))
          : undefined,
        amount_max: newParams.get("amount_max")
          ? Number(newParams.get("amount_max"))
          : undefined,
      };

      const newQueryKey = [
        "expenses",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getExpenses(
            newPage,
            newPageSize,
            getAllExpenses || newPageSize === 0,
            newFilters
          ),
      });
    },
    [searchParams, queryClient, router, getAllExpenses]
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
    (filters: Partial<ExpenseFilters>) => {
      navigate({ filters });
    },
    [navigate]
  );

  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultExpenseFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [navigate]);

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("expenses_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
  const { mutate: addExpenseMutation, status: addExpenseStatus } = useMutation({
    mutationFn: async (data: { data: ExpenseFormValues; userId: string }) =>
      addExpense(data.userId, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error) => {
      console.error("Error adding Expense:", error);
    },
  });

  const { mutate: updateExpenseMutation, status: updateExpenseStatus } =
    useMutation({
      mutationFn: async (data: {
        id: string;
        data: Partial<ExpenseFormValues>;
        userId: string;
      }) => updateExpense(data.id, data.data, data.userId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
      },
      onError: (error) => {
        console.error("Error updating Expense:", error);
      },
    });

  const { mutate: softDeleteExpenseMutation, status: softDeleteExpenseStatus } =
    useMutation({
      mutationFn: async (data: { id: string; userId: string }) =>
        softDeleteExpense(data.id, data.userId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
      },
      onError: (error) => {
        console.error("Error deactivating Expense:", error);
      },
    });

  // Utility for fetching a single Expense by ID
  const useSingleExpense = (id: string) => {
    return useQuery({
      queryKey: ["expenses", id],
      queryFn: () => getExpenseById(id),
      enabled: !!id,
      staleTime: 60000,
    });
  };

  return {
    expenses: data?.documents || [],
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
    addExpense: addExpenseMutation,
    isAddingExpense: addExpenseStatus === "pending",
    updateExpense: updateExpenseMutation,
    isUpdatingExpense: updateExpenseStatus === "pending",
    softDeleteExpense: softDeleteExpenseMutation,
    isSoftDeletingExpense: softDeleteExpenseStatus === "pending",
    // Single fetch utility
    useSingleExpense,
  };
};
