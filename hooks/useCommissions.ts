"use client";

import {
  createCommission,
  generateCommissionRefNumber,
  getCommissionById,
  getCommissions,
  payoutCommissionRecipient,
  softDeleteCommission,
  updateCommission,
  updateCommissionStatus,
} from "@/lib/actions/commission.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CommissionFilters,
  CommissionRecipientPayoutFormValues,
  SalesCommissionFormValues,
} from "@/lib/validation";
import {
  CommissionWithRelations,
  CommissionStatus,
  CommissionPaymentStatus,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseCommissionsOptions {
  getAllCommissions?: boolean;
  initialData?: { documents: CommissionWithRelations[]; total: number };
}

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
};

export const useCommissions = ({
  getAllCommissions = false,
  initialData,
}: UseCommissionsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const currentState = useMemo(() => {
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
    };

    return { page, pageSize, filters };
  }, [getAllCommissions, searchParams]);

  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["commissions", page, pageSize, filterString];
  }, [currentState]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
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

  const navigate = useCallback(
    (
      updates: Partial<{
        page: number;
        pageSize: number;
        search: string;
        filters: Partial<CommissionFilters>;
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

      const newUrl = `?${params.toString()}`;
      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });

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
      };

      const newQueryKey = [
        "commissions",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];
      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getCommissions(
            newPage,
            newPageSize,
            getAllCommissions || newPageSize === 0,
            newFilters
          ),
      });
    },
    [searchParams, queryClient, router, getAllCommissions]
  );

  const setPage = useCallback((page: number) => navigate({ page }), [navigate]);
  const setPageSize = useCallback(
    (pageSize: number) => navigate({ pageSize, page: 0 }),
    [navigate]
  );
  const setSearch = useCallback(
    (search: string) =>
      navigate({ filters: { ...currentState.filters, search } }),
    [navigate, currentState.filters]
  );
  const setFilters = useCallback(
    (filters: Partial<CommissionFilters>) => {
      navigate({ filters: { ...currentState.filters, ...filters } });
    },
    [navigate, currentState.filters]
  );
  const clearFilters = useCallback(() => {
    navigate({
      filters: defaultCommissionFilters,
      search: "",
      page: 0,
      pageSize: 10,
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
        () => queryClient.invalidateQueries({ queryKey: ["commissions"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(recipientChannel);
      supabase.removeChannel(salesAgentChannel);
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
    mutate: payoutCommissionRecipientMutation,
    status: payoutCommissionRecipientStatus,
  } = useMutation({
    mutationFn: async (data: {
      recipientId: string;
      values: CommissionRecipientPayoutFormValues;
      userId: string;
    }) => payoutCommissionRecipient(data.recipientId, data.values, data.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error) =>
      console.error("Error paying out commission recipient:", error),
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
    commissions: data?.documents || [],
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
    createCommission: createCommissionMutation,
    isCreatingCommission: createCommissionStatus === "pending",
    updateCommission: updateCommissionMutation,
    isUpdatingCommission: updateCommissionStatusLocal === "pending",
    payoutCommissionRecipient: payoutCommissionRecipientMutation,
    isPayingOutCommissionRecipient:
      payoutCommissionRecipientStatus === "pending",
    updateMainCommissionStatus: updateMainCommissionStatusMutation,
    isUpdatingMainCommissionStatus:
      updateMainCommissionStatusStatus === "pending",
    softDeleteCommission: softDeleteCommissionMutation,
    isSoftDeletingCommission: softDeleteCommissionStatus === "pending",
    useSingleCommission,
    generateCommissionRefNumber,
  };
};
