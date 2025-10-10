/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  addChartOfAccount,
  getChartOfAccounts,
  getChartOfAccountById,
  updateChartOfAccount,
  softDeleteChartOfAccount,
} from "@/lib/actions/accounting.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChartOfAccountFormValues } from "@/lib/validation";
import { ChartOfAccountWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

interface UseChartOfAccountsOptions {
  getAllCoAs?: boolean;
  initialData?: ChartOfAccountWithRelations[];
}

export const useChartOfAccounts = ({
  getAllCoAs = false,
  initialData,
}: UseChartOfAccountsOptions = {}) => {
  const queryClient = useQueryClient();

  // Create stable query key based on relevant options
  const queryKey = useMemo(() => {
    return ["chartOfAccounts", getAllCoAs];
  }, [getAllCoAs]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      return getChartOfAccounts();
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllCoAs ? 60000 * 5 : 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Real-time updates via Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Listen for changes in the chart_of_accounts table
    const channel = supabase
      .channel("chart_of_accounts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chart_of_accounts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
          queryClient.invalidateQueries({ queryKey: ["incomeCategories"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // --- Mutations ---
  const { mutate: addChartOfAccountMutation, status: addChartOfAccountStatus } =
    useMutation({
      mutationFn: async (data: ChartOfAccountFormValues) =>
        addChartOfAccount(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] });
      },
      onError: (error) => {
        console.error("Error adding Chart of Account:", error);
      },
    });

  const {
    mutate: updateChartOfAccountMutation,
    status: updateChartOfAccountStatus,
  } = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ChartOfAccountFormValues;
    }) => updateChartOfAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] });
    },
    onError: (error) => {
      console.error("Error updating Chart of Account:", error);
    },
  });

  const {
    mutate: softDeleteChartOfAccountMutation,
    status: softDeleteChartOfAccountStatus,
  } = useMutation({
    mutationFn: async (id: string) => softDeleteChartOfAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] });
    },
    onError: (error) => {
      console.error("Error deactivating Chart of Account:", error);
    },
  });

  // Utility for fetching a single CoA by ID if needed (e.g., for an edit form)
  const useSingleChartOfAccount = (id: string) => {
    return useQuery({
      queryKey: ["chartOfAccounts", id],
      queryFn: () => getChartOfAccountById(id),
      enabled: !!id, // Only run if ID is provided
      staleTime: 60000,
    });
  };

  return {
    chartOfAccounts: data || [],
    isLoading: isLoading,
    isFetching,
    error,
    refetch,
    addChartOfAccount: addChartOfAccountMutation,
    isAddingChartOfAccount: addChartOfAccountStatus === "pending",
    updateChartOfAccount: updateChartOfAccountMutation,
    isUpdatingChartOfAccount: updateChartOfAccountStatus === "pending",
    softDeleteChartOfAccount: softDeleteChartOfAccountMutation,
    isSoftDeletingChartOfAccount: softDeleteChartOfAccountStatus === "pending",
    useSingleChartOfAccount,
  };
};
