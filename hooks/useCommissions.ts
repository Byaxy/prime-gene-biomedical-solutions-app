"use client";

import {
  createCommission,
  generateCommissionRefNumber,
  getCommissionById,
  getCommissions,
  processCommissionPayouts,
  softDeleteCommission,
  updateCommission,
  updateCommissionStatus,
  getCommissionPayouts,
} from "@/lib/actions/commission.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CommissionFilters,
  CommissionRecipientPayoutFormValues,
  SalesCommissionFormValues,
  CommissionPayoutFilters,
} from "@/lib/validation";
import {
  CommissionWithRelations,
  CommissionStatus,
  CommissionPaymentStatus,
  GetCommissionPayoutWithRelations,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseCommissionsOptions {
  getAllCommissions?: boolean;
  initialData?: { documents: CommissionWithRelations[]; total: number };
  getAllPayouts?: boolean;
  initialPayoutsData?: {
    documents: GetCommissionPayoutWithRelations[];
    total: number;
  };
}

// Default filters for main commissions
export const defaultCommissionFilters: CommissionFilters = {
  search: undefined,
  salesAgentId: undefined,
  saleId: undefined,
  status: undefined,
  paymentStatus: undefined,
  commissionDate_start: undefined,
  commissionDate_end: undefined,
  amount_min: undefined,
  amount_max: undefined,
  customerId: undefined,
};

//  Default filters for commission payouts
export const defaultCommissionPayoutFilters: CommissionPayoutFilters = {
  search: undefined,
  payoutRefNumber: undefined,
  commissionId: undefined,
  commissionRecipientId: undefined,
  salesAgentId: undefined,
  payingAccountId: undefined,
  expenseCategoryId: undefined,
  payoutDate_start: undefined,
  payoutDate_end: undefined,
  amount_min: undefined,
  amount_max: undefined,
};

export const useCommissions = ({
  getAllCommissions = false,
  initialData,
  getAllPayouts = false,
  initialPayoutsData,
}: UseCommissionsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // State for main commissions list
  const currentCommissionListState = useMemo(() => {
    if (getAllCommissions) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
        filters: defaultCommissionFilters,
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: CommissionFilters = {
      search: search || undefined,
      salesAgentId: searchParams.get("salesAgentId") || undefined,
      saleId: searchParams.get("saleId") || undefined,
      status: (searchParams.get("status") as CommissionStatus) || undefined,
      paymentStatus:
        (searchParams.get("paymentStatus") as CommissionPaymentStatus) ||
        undefined,
      commissionDate_start:
        searchParams.get("commissionDate_start") || undefined,
      commissionDate_end: searchParams.get("commissionDate_end") || undefined,
      amount_min: searchParams.get("amount_min")
        ? Number(searchParams.get("amount_min"))
        : undefined,
      amount_max: searchParams.get("amount_max")
        ? Number(searchParams.get("amount_max"))
        : undefined,
      customerId: searchParams.get("customerId") || undefined,
    };

    return { page, pageSize, filters };
  }, [getAllCommissions, searchParams]);

  // State for commission payouts list
  const currentPayoutListState = useMemo(() => {
    if (getAllPayouts) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
        filters: defaultCommissionPayoutFilters,
      };
    }

    const page = Number(searchParams.get("payoutPage") || 0);
    const pageSize = Number(searchParams.get("payoutPageSize") || 10);
    const search = searchParams.get("payoutSearch") || "";

    const filters: CommissionPayoutFilters = {
      search: search || undefined,
      payoutRefNumber: searchParams.get("payoutRefNumber") || undefined,
      commissionId: searchParams.get("payoutCommissionId") || undefined,
      commissionRecipientId: searchParams.get("payoutRecipientId") || undefined,
      salesAgentId: searchParams.get("payoutSalesAgentId") || undefined,
      payingAccountId: searchParams.get("payoutPayingAccountId") || undefined,
      expenseCategoryId:
        searchParams.get("payoutExpenseCategoryId") || undefined,
      payoutDate_start: searchParams.get("payoutDate_start") || undefined,
      payoutDate_end: searchParams.get("payoutDate_end") || undefined,
      amount_min: searchParams.get("payoutAmount_min")
        ? Number(searchParams.get("payoutAmount_min"))
        : undefined,
      amount_max: searchParams.get("payoutAmount_max")
        ? Number(searchParams.get("payoutAmount_max"))
        : undefined,
    };

    return { page, pageSize, filters };
  }, [getAllPayouts, searchParams]);

  const commissionQueryKey = useMemo(() => {
    const { page, pageSize, filters } = currentCommissionListState;
    const filterString = JSON.stringify(filters);
    return ["commissions", page, pageSize, filterString];
  }, [currentCommissionListState]);

  const payoutQueryKey = useMemo(() => {
    const { page, pageSize, filters } = currentPayoutListState;
    const filterString = JSON.stringify(filters);
    return ["commissionPayouts", page, pageSize, filterString];
  }, [currentPayoutListState]);

  // Query for main commissions list
  const {
    data: commissionsData,
    isLoading: isCommissionsLoading,
    isFetching: isCommissionsFetching,
    error: commissionsError,
    refetch: refetchCommissions,
  } = useQuery({
    queryKey: commissionQueryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentCommissionListState;
      return getCommissions(
        page,
        pageSize,
        getAllCommissions || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllCommissions ? 60000 * 5 : 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const {
    data: payoutsData,
    isLoading: isPayoutsLoading,
    isFetching: isPayoutsFetching,
    error: payoutsError,
    refetch: refetchPayouts,
  } = useQuery({
    queryKey: payoutQueryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentPayoutListState;
      return getCommissionPayouts(
        page,
        pageSize,
        getAllPayouts || pageSize === 0,
        filters
      );
    },
    initialData: initialPayoutsData ? () => initialPayoutsData : undefined,
    staleTime: getAllPayouts ? 60000 * 5 : 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const navigate = useCallback(
    (
      updates: Partial<{
        page: number;
        pageSize: number;
        search: string;
        filters: Partial<CommissionFilters>;
        // NEW: Payout-specific navigation
        payoutPage: number;
        payoutPageSize: number;
        payoutSearch: string;
        payoutFilters: Partial<CommissionPayoutFilters>;
      }>
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      // --- Main Commissions Navigation ---
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
        Object.keys(defaultCommissionFilters).forEach((key) =>
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

      // --- NEW: Payouts Navigation ---
      if (updates.payoutPage !== undefined) {
        params.set(
          "payoutPage",
          String(updates.payoutPage === 0 ? "" : updates.payoutPage)
        );
      }
      if (updates.payoutPageSize !== undefined) {
        params.set(
          "payoutPageSize",
          String(updates.payoutPageSize === 10 ? "" : updates.payoutPageSize)
        );
        params.delete("payoutPage");
      }
      if (updates.payoutSearch !== undefined) {
        if (updates.payoutSearch.trim()) {
          params.set("payoutSearch", updates.payoutSearch.trim());
        } else {
          params.delete("payoutSearch");
        }
        params.delete("payoutPage");
      }
      if (updates.payoutFilters) {
        Object.keys(defaultCommissionPayoutFilters).forEach((key) =>
          params.delete(`payout${key.charAt(0).toUpperCase() + key.slice(1)}`)
        );
        Object.entries(updates.payoutFilters).forEach(([key, value]) => {
          if (value === undefined || value === "" || value === null) {
            params.delete(
              `payout${key.charAt(0).toUpperCase() + key.slice(1)}`
            );
          } else {
            params.set(
              `payout${key.charAt(0).toUpperCase() + key.slice(1)}`,
              String(value)
            );
          }
        });
        params.delete("payoutPage");
      }

      const newUrl = `?${params.toString()}`;
      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });

      // --- Prefetching for commissions ---
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: CommissionFilters = {
        search: newParams.get("search") || undefined,
        salesAgentId: newParams.get("salesAgentId") || undefined,
        saleId: newParams.get("saleId") || undefined,
        status: (newParams.get("status") as CommissionStatus) || undefined,
        paymentStatus:
          (newParams.get("paymentStatus") as CommissionPaymentStatus) ||
          undefined,
        commissionDate_start:
          newParams.get("commissionDate_start") || undefined,
        commissionDate_end: newParams.get("commissionDate_end") || undefined,
        amount_min: newParams.get("amount_min")
          ? Number(newParams.get("amount_min"))
          : undefined,
        amount_max: newParams.get("amount_max")
          ? Number(newParams.get("amount_max"))
          : undefined,
        customerId: newParams.get("customerId") || undefined,
      };

      const newCommissionQueryKey = [
        "commissions",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];
      queryClient.prefetchQuery({
        queryKey: newCommissionQueryKey,
        queryFn: () =>
          getCommissions(
            newPage,
            newPageSize,
            getAllCommissions || newPageSize === 0,
            newFilters
          ),
      });

      // --- NEW: Prefetching for payouts ---
      const newPayoutPage = Number(newParams.get("payoutPage") || 0);
      const newPayoutPageSize = Number(newParams.get("payoutPageSize") || 10);
      const newPayoutFilters: CommissionPayoutFilters = {
        search: newParams.get("payoutSearch") || undefined,
        payoutRefNumber: newParams.get("payoutRefNumber") || undefined,
        commissionId: newParams.get("payoutCommissionId") || undefined,
        commissionRecipientId: newParams.get("payoutRecipientId") || undefined,
        salesAgentId: newParams.get("payoutSalesAgentId") || undefined,
        payingAccountId: newParams.get("payoutPayingAccountId") || undefined,
        expenseCategoryId:
          newParams.get("payoutExpenseCategoryId") || undefined,
        payoutDate_start: newParams.get("payoutDate_start") || undefined,
        payoutDate_end: newParams.get("payoutDate_end") || undefined,
        amount_min: newParams.get("payoutAmount_min")
          ? Number(newParams.get("payoutAmount_min"))
          : undefined,
        amount_max: newParams.get("payoutAmount_max")
          ? Number(newParams.get("payoutAmount_max"))
          : undefined,
      };
      const newPayoutQueryKey = [
        "commissionPayouts",
        newPayoutPage,
        newPayoutPageSize,
        JSON.stringify(newPayoutFilters),
      ];
      queryClient.prefetchQuery({
        queryKey: newPayoutQueryKey,
        queryFn: () =>
          getCommissionPayouts(
            newPayoutPage,
            newPayoutPageSize,
            getAllPayouts || newPayoutPageSize === 0,
            newPayoutFilters
          ),
      });
    },
    [searchParams, queryClient, router, getAllCommissions, getAllPayouts]
  );

  // --- Main Commissions Setters ---
  const setPage = useCallback((page: number) => navigate({ page }), [navigate]);
  const setPageSize = useCallback(
    (pageSize: number) => navigate({ pageSize, page: 0 }),
    [navigate]
  );
  const setSearch = useCallback(
    (search: string) =>
      navigate({ filters: { ...currentCommissionListState.filters, search } }),
    [navigate, currentCommissionListState.filters]
  );
  const setFilters = useCallback(
    (filters: Partial<CommissionFilters>) => {
      navigate({
        filters: { ...currentCommissionListState.filters, ...filters },
      });
    },
    [navigate, currentCommissionListState.filters]
  );
  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultCommissionFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [navigate]);

  // --- NEW: Payouts Setters ---
  const setPayoutPage = useCallback(
    (payoutPage: number) => navigate({ payoutPage }),
    [navigate]
  );
  const setPayoutPageSize = useCallback(
    (payoutPageSize: number) => navigate({ payoutPageSize, payoutPage: 0 }),
    [navigate]
  );
  const setPayoutSearch = useCallback(
    (payoutSearch: string) =>
      navigate({
        payoutFilters: {
          ...currentPayoutListState.filters,
          search: payoutSearch,
        },
      }),
    [navigate, currentPayoutListState.filters]
  );
  const setPayoutFilters = useCallback(
    (payoutFilters: Partial<CommissionPayoutFilters>) => {
      navigate({
        payoutFilters: { ...currentPayoutListState.filters, ...payoutFilters },
      });
    },
    [navigate, currentPayoutListState.filters]
  );
  const clearPayoutFilters = useCallback(() => {
    navigate({
      payoutFilters: defaultCommissionPayoutFilters,
      payoutSearch: "",
      payoutPage: 0,
      payoutPageSize: 10,
    });
  }, [navigate]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("commissions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commissions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["commissions"] });
          queryClient.invalidateQueries({ queryKey: ["commissionPayouts"] });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
        }
      )
      .subscribe();
    const recipientChannel = supabase
      .channel("commission_recipients_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commission_recipients" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["commissions"] });
          queryClient.invalidateQueries({ queryKey: ["commissionPayouts"] });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
        }
      )
      .subscribe();
    // Invalidate if sales agents change, as their names are displayed
    const salesAgentChannel = supabase
      .channel("sales_agents_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_agents" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["commissions"] });
          queryClient.invalidateQueries({ queryKey: ["commissionPayouts"] });
        }
      )
      .subscribe();

    const payoutChannel = supabase
      .channel("commission_payouts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commission_payouts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["commissions"] });
          queryClient.invalidateQueries({ queryKey: ["commissionPayouts"] });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
        }
      )
      .subscribe();

    const accountsChannel = supabase
      .channel("accounts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["commissions"] });
          queryClient.invalidateQueries({ queryKey: ["commissionPayouts"] });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
        }
      )
      .subscribe();

    const expenseCategoriesChannel = supabase
      .channel("expense_categories_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_categories" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["commissionPayouts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(recipientChannel);
      supabase.removeChannel(salesAgentChannel);
      supabase.removeChannel(payoutChannel);
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(expenseCategoriesChannel);
    };
  }, [queryClient]);

  const { mutate: createCommissionMutation, status: createCommissionStatus } =
    useMutation({
      mutationFn: async (data: { values: SalesCommissionFormValues }) =>
        createCommission({ values: data.values }),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: ["commissions"] }),
      onError: (error) => console.error("Error creating commission:", error),
    });

  const {
    mutate: updateCommissionMutation,
    status: updateCommissionStatusLocal,
  } = useMutation({
    mutationFn: async (data: {
      id: string;
      values: SalesCommissionFormValues;
    }) => updateCommission({ id: data.id, values: data.values }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["commissions"] }),
    onError: (error) => console.error("Error updating commission:", error),
  });

  const {
    mutate: processCommissionPayoutsMutation,
    status: processCommissionPayoutsStatus,
  } = useMutation({
    mutationFn: async (data: {
      values: CommissionRecipientPayoutFormValues;
      userId: string;
    }) => processCommissionPayouts(data.values, data.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      queryClient.invalidateQueries({ queryKey: ["commissionPayouts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
    onError: (error) =>
      console.error("Error processing commission payouts:", error),
  });

  const {
    mutate: updateMainCommissionStatusMutation,
    status: updateMainCommissionStatusStatus,
  } = useMutation({
    mutationFn: async (data: {
      commissionId: string;
      newStatus: CommissionStatus;
    }) => updateCommissionStatus(data.commissionId, data.newStatus),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["commissions"] }),
    onError: (error) =>
      console.error("Error updating main commission status:", error),
  });

  const {
    mutate: softDeleteCommissionMutation,
    status: softDeleteCommissionStatus,
  } = useMutation({
    mutationFn: async (data: { id: string }) => softDeleteCommission(data.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["commissions"] }),
    onError: (error) => console.error("Error deactivating commission:", error),
  });

  const useSingleCommission = (id: string) => {
    return useQuery({
      queryKey: ["commissions", id],
      queryFn: () => getCommissionById(id),
      enabled: !!id,
      staleTime: 60000,
    });
  };

  return {
    commissions: commissionsData?.documents || [],
    totalItems: commissionsData?.total || 0,
    page: currentCommissionListState.page,
    pageSize: currentCommissionListState.pageSize,
    search: currentCommissionListState.search,
    filters: currentCommissionListState.filters,
    isLoading: isCommissionsLoading || isPending,
    isFetching: isCommissionsFetching,
    error: commissionsError,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetchCommissions,

    commissionPayouts: payoutsData?.documents || [],
    totalPayouts: payoutsData?.total || 0,
    payoutPage: currentPayoutListState.page,
    payoutPageSize: currentPayoutListState.pageSize,
    payoutSearch: currentPayoutListState.search,
    payoutFilters: currentPayoutListState.filters,
    isPayoutsLoading: isPayoutsLoading || isPending,
    isPayoutsFetching: isPayoutsFetching,
    payoutsError: payoutsError,
    setPayoutPage,
    setPayoutPageSize,
    setPayoutSearch,
    setPayoutFilters,
    clearPayoutFilters,
    refetchPayouts,

    // Mutations
    createCommission: createCommissionMutation,
    isCreatingCommission: createCommissionStatus === "pending",
    updateCommission: updateCommissionMutation,
    isUpdatingCommission: updateCommissionStatusLocal === "pending",
    processCommissionPayouts: processCommissionPayoutsMutation,
    isProcessingCommissionPayouts: processCommissionPayoutsStatus === "pending",
    updateMainCommissionStatus: updateMainCommissionStatusMutation,
    isUpdatingMainCommissionStatus:
      updateMainCommissionStatusStatus === "pending",
    softDeleteCommission: softDeleteCommissionMutation,
    isSoftDeletingCommission: softDeleteCommissionStatus === "pending",
    useSingleCommission,
    generateCommissionRefNumber,
  };
};
