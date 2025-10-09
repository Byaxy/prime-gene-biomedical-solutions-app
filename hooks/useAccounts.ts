/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  addAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  softDeleteAccount,
} from "@/lib/actions/accounting.actions";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AccountFilters, AccountFormValues } from "@/lib/validation";
import { AccountWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseAccountsOptions {
  getAllAccounts?: boolean;
  initialData?: { documents: AccountWithRelations[]; total: number };
}

const defaultAccountFilters: AccountFilters = {
  search: undefined,
  accountType: undefined,
};

export const useAccounts = ({
  getAllAccounts = false,
  initialData,
}: UseAccountsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllAccounts) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: AccountFilters = {
      search: search || undefined,
      accountType: (searchParams.get("accountType") as any) || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllAccounts, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["accounts", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getAccounts(
        page,
        pageSize,
        getAllAccounts || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllAccounts ? 60000 * 5 : 30000,
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
        filters: Partial<AccountFilters>;
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
        Object.keys(defaultAccountFilters).forEach((key) => params.delete(key));

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

      // Prefetch the new data immediately
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: AccountFilters = {
        search: newParams.get("search") || undefined,
        accountType: (newParams.get("accountType") as any) || undefined,
      };

      const newQueryKey = [
        "accounts",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getAccounts(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllAccounts) return;
      navigate({ page });
    },
    [getAllAccounts, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllAccounts) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllAccounts, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllAccounts) return;
      navigate({ search });
    },
    [getAllAccounts, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<AccountFilters>) => {
      if (getAllAccounts) return;
      navigate({ filters });
    },
    [getAllAccounts, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllAccounts) return;
    navigate({
      filters: defaultAccountFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllAccounts, navigate]);

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("accounts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accounts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // --- Mutations ---
  const { mutate: addAccountMutation, status: addAccountStatus } = useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: AccountFormValues;
      userId: string;
    }) => addAccount(data, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error) => {
      console.error("Error adding Financial Account:", error);
    },
  });

  const { mutate: updateAccountMutation, status: updateAccountStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: Partial<AccountFormValues>;
      }) => updateAccount(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      },
      onError: (error) => {
        console.error("Error updating Financial Account:", error);
      },
    });

  const { mutate: softDeleteAccountMutation, status: softDeleteAccountStatus } =
    useMutation({
      mutationFn: async (id: string) => softDeleteAccount(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      },
      onError: (error) => {
        console.error("Error deactivating Financial Account:", error);
      },
    });

  // Utility for fetching a single Account by ID if needed (e.g., for an edit form)
  const useSingleAccount = (id: string) => {
    return useQuery({
      queryKey: ["accounts", id],
      queryFn: () => getAccountById(id),
      enabled: !!id,
      staleTime: 60000,
    });
  };

  return {
    accounts: data?.documents || [],
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
    addAccount: addAccountMutation,
    isAddingAccount: addAccountStatus === "pending",
    updateAccount: updateAccountMutation,
    isUpdatingAccount: updateAccountStatus === "pending",
    softDeleteAccount: softDeleteAccountMutation,
    isSoftDeletingAccount: softDeleteAccountStatus === "pending",
    // Single fetch utility
    useSingleAccount,
  };
};
