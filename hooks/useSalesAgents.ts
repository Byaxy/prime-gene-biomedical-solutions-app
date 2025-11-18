"use client";

import {
  createSalesAgent,
  getSalesAgentById,
  getSalesAgents,
  softDeleteSalesAgent,
  updateSalesAgent,
} from "@/lib/actions/salesAgent.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SalesAgentFormValues } from "@/lib/validation";
import { SalesAgentWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";

interface UseSalesAgentsOptions {
  getAllSalesAgents?: boolean;
  initialData?: { documents: SalesAgentWithRelations[]; total: number };
}

export const defaultSalesAgentFilters: { search?: string } = {
  search: undefined,
};

export const useSalesAgents = ({
  getAllSalesAgents = false,
  initialData,
}: UseSalesAgentsOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const currentState = useMemo(() => {
    if (getAllSalesAgents) {
      return { page: 0, pageSize: 0, search: "" };
    }
    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";
    return { page, pageSize, search };
  }, [getAllSalesAgents, searchParams]);

  const queryKey = useMemo(() => {
    const { page, pageSize, search } = currentState;
    return ["salesAgents", page, pageSize, search];
  }, [currentState]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, search } = currentState;
      return getSalesAgents(
        page,
        pageSize,
        getAllSalesAgents || pageSize === 0,
        { search }
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllSalesAgents ? 60000 * 5 : 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const navigate = useCallback(
    (
      updates: Partial<{
        page: number;
        pageSize: number;
        search: string;
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

      const newUrl = `?${params.toString()}`;
      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });

      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newSearch = newParams.get("search") || "";

      const newQueryKey = ["salesAgents", newPage, newPageSize, newSearch];
      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getSalesAgents(
            newPage,
            newPageSize,
            getAllSalesAgents || newPageSize === 0,
            {
              search: newSearch,
            }
          ),
      });
    },
    [searchParams, queryClient, router, getAllSalesAgents]
  );

  const setPage = useCallback((page: number) => navigate({ page }), [navigate]);
  const setPageSize = useCallback(
    (pageSize: number) => navigate({ pageSize, page: 0 }),
    [navigate]
  );
  const setSearch = useCallback(
    (search: string) => navigate({ search }),
    [navigate]
  );
  const clearFilters = useCallback(() => {
    navigate({ search: "", page: 0, pageSize: 10 });
  }, [navigate]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("sales_agents_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_agents" },
        () => queryClient.invalidateQueries({ queryKey: ["salesAgents"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { mutate: createSalesAgentMutation, status: createSalesAgentStatus } =
    useMutation({
      mutationFn: async (data: SalesAgentFormValues) => createSalesAgent(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["salesAgents"] });
      },
      onError: (error) => console.error("Error creating sales agent:", error),
    });

  const { mutate: updateSalesAgentMutation, status: updateSalesAgentStatus } =
    useMutation({
      mutationFn: async (data: {
        id: string;
        values: Partial<SalesAgentFormValues>;
      }) => updateSalesAgent(data.id, data.values),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["salesAgents"] });
      },
      onError: (error) => console.error("Error updating sales agent:", error),
    });

  const {
    mutate: softDeleteSalesAgentMutation,
    status: softDeleteSalesAgentStatus,
  } = useMutation({
    mutationFn: async (id: string) => softDeleteSalesAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesAgents"] });
    },
    onError: (error) => console.error("Error deactivating sales agent:", error),
  });

  const useSingleSalesAgent = (id: string) => {
    return useQuery({
      queryKey: ["salesAgents", id],
      queryFn: () => getSalesAgentById(id),
      enabled: !!id,
      staleTime: 60000,
    });
  };

  return {
    salesAgents: data?.documents || [],
    totalItems: data?.total || 0,
    page: currentState.page,
    pageSize: currentState.pageSize,
    search: currentState.search,
    isLoading: isLoading || isPending,
    isFetching,
    error,
    setPage,
    setPageSize,
    setSearch,
    clearFilters,
    refetch,
    createSalesAgent: createSalesAgentMutation,
    isCreatingSalesAgent: createSalesAgentStatus === "pending",
    updateSalesAgent: updateSalesAgentMutation,
    isUpdatingSalesAgent: updateSalesAgentStatus === "pending",
    softDeleteSalesAgent: softDeleteSalesAgentMutation,
    isSoftDeletingSalesAgent: softDeleteSalesAgentStatus === "pending",
    useSingleSalesAgent,
  };
};
