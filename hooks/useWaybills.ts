"use client";

import {
  addWaybill,
  convertLoanWaybill,
  deleteWaybill,
  editWaybill,
  getWaybills,
  softDeleteWaybill,
} from "@/lib/actions/waybill.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ConvertLoanWaybillFormValues,
  WaybillFormValues,
} from "@/lib/validation";
import { WaybillWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

interface UseWaybillsOptions {
  getAllWaybills?: boolean;
  initialData?: { documents: WaybillWithRelations[]; total: number };
}

export interface WaybillFilters {
  search?: string;
  waybillDate_start?: string;
  waybillDate_end?: string;
  status?: string;
  waybillType?: string;
  isConverted?: boolean;
  conversionStatus?: string;
}

export const defaultWaybillFilters: WaybillFilters = {
  waybillDate_start: undefined,
  waybillDate_end: undefined,
  status: undefined,
  waybillType: undefined,
  isConverted: undefined,
  conversionStatus: undefined,
};

export const useWaybills = ({
  getAllWaybills = false,
  initialData,
}: UseWaybillsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllWaybills) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: WaybillFilters = {
      search: search || undefined,
      status: searchParams.get("status") || undefined,
      waybillDate_start: searchParams.get("waybillDate_start") || undefined,
      waybillDate_end: searchParams.get("waybillDate_end") || undefined,
      waybillType: searchParams.get("waybillType") || undefined,
      isConverted: searchParams.get("isConverted") === "true" || undefined,
      conversionStatus: searchParams.get("conversionStatus") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllWaybills, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["waybills", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getWaybills(
        page,
        pageSize,
        getAllWaybills || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllWaybills ? 60000 : 30000,
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
        filters: Partial<WaybillFilters>;
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
        Object.keys(defaultWaybillFilters).forEach((key) => params.delete(key));

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

      // Use startTransition for non-urgent updates
      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });

      // Prefetch the new data immediately
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: WaybillFilters = {
        search: newParams.get("search") || undefined,

        status: newParams.get("status") || undefined,
        waybillDate_start: newParams.get("waybillDate_start") || undefined,
        waybillDate_end: newParams.get("waybillDate_end") || undefined,
        waybillType: newParams.get("waybillType") || undefined,
        isConverted: newParams.get("isConverted") === "true" || undefined,
        conversionStatus: newParams.get("conversionStatus") || undefined,
      };

      const newQueryKey = [
        "waybills",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getWaybills(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllWaybills) return;
      navigate({ page });
    },
    [getAllWaybills, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllWaybills) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllWaybills, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllWaybills) return;
      navigate({ search });
    },
    [getAllWaybills, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<WaybillFilters>) => {
      if (getAllWaybills) return;
      navigate({ filters });
    },
    [getAllWaybills, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllWaybills) return;
    navigate({
      filters: defaultWaybillFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllWaybills, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("waybills_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waybills",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["waybills"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Add Waybill Mutation
  const { mutate: addWaybillMutation, status: addWaybillStatus } = useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: WaybillFormValues;
      userId: string;
    }) => addWaybill(data, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waybills"] });
    },
  });

  // Convert Loan Waybill Mutation
  const {
    mutate: convertLoanWaybillMutation,
    status: convertLoanWaybillStatus,
  } = useMutation({
    mutationFn: async ({
      data,
      loanWaybillId,
    }: {
      data: ConvertLoanWaybillFormValues;
      loanWaybillId: string;
    }) => convertLoanWaybill(data, loanWaybillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waybills"] });
    },
  });

  // Edit Waybill Mutation
  const { mutate: editWaybillMutation, status: editWaybillStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
        userId,
      }: {
        id: string;
        data: WaybillFormValues;
        userId: string;
      }) => editWaybill(data, id, userId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["waybills"],
        });
      },
    });

  const { mutate: deleteWaybillMutation, status: deleteWaybillStatus } =
    useMutation({
      mutationFn: ({ id, userId }: { id: string; userId: string }) =>
        deleteWaybill(id, userId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["waybills"],
        });
        toast.success("Waybill deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting waybill:", error);
        toast.error("Failed to delete waybill");
      },
    });

  const { mutate: softDeleteWaybillMutation, status: softDeleteWaybillStatus } =
    useMutation({
      mutationFn: ({ id, userId }: { id: string; userId: string }) =>
        softDeleteWaybill(id, userId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["waybills"],
        });
      },
    });

  return {
    waybills: data?.documents || [],
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
    addWaybill: addWaybillMutation,
    isAddingWaybill: addWaybillStatus === "pending",
    editWaybill: editWaybillMutation,
    isEditingWaybill: editWaybillStatus === "pending",
    deleteWaybill: deleteWaybillMutation,
    isDeletingWaybill: deleteWaybillStatus === "pending",
    softDeleteWaybill: softDeleteWaybillMutation,
    isSoftDeletingWaybill: softDeleteWaybillStatus === "pending",
    convertLoanWaybill: convertLoanWaybillMutation,
    isConvertingLoanWaybill: convertLoanWaybillStatus === "pending",
  };
};
