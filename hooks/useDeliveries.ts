"use client";

import {
  addDelivery,
  deleteDelivery,
  editDelivery,
  getDeliveries,
  softDeleteDelivery,
} from "@/lib/actions/delivery.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DeliveryFormValues } from "@/lib/validation";
import { DeliveryWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

export interface DeliveryFilters {
  search?: string;
  deliveryDate_start?: string;
  deliveryDate_end?: string;
  status?: string;
}

interface UseDeliveriesOptions {
  getAllDeliveries?: boolean;
  initialData?: { documents: DeliveryWithRelations[]; total: number };
}

export const defaultDeliveryFilters: DeliveryFilters = {
  deliveryDate_start: undefined,
  deliveryDate_end: undefined,
  status: undefined,
};

export const useDeliveries = ({
  getAllDeliveries = false,
  initialData,
}: UseDeliveriesOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllDeliveries) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: DeliveryFilters = {
      search: search || undefined,
      status: searchParams.get("status") || undefined,
      deliveryDate_start: searchParams.get("deliveryDate_start") || undefined,
      deliveryDate_end: searchParams.get("deliveryDate_end") || undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllDeliveries, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["deliveries", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getDeliveries(
        page,
        pageSize,
        getAllDeliveries || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllDeliveries ? 60000 : 30000,
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
        filters: Partial<DeliveryFilters>;
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
        Object.keys(defaultDeliveryFilters).forEach((key) =>
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

      // Use startTransition for non-urgent updates
      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });

      // Prefetch the new data immediately
      const newParams = new URLSearchParams(newUrl.substring(1));
      const newPage = Number(newParams.get("page") || 0);
      const newPageSize = Number(newParams.get("pageSize") || 10);
      const newFilters: DeliveryFilters = {
        search: newParams.get("search") || undefined,
        status: newParams.get("status") || undefined,
        deliveryDate_start: newParams.get("deliveryDate_start") || undefined,
        deliveryDate_end: newParams.get("deliveryDate_end") || undefined,
      };

      const newQueryKey = [
        "deliveries",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getDeliveries(newPage, newPageSize, newPageSize === 0, newFilters),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllDeliveries) return;
      navigate({ page });
    },
    [getAllDeliveries, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllDeliveries) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllDeliveries, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllDeliveries) return;
      navigate({ search });
    },
    [getAllDeliveries, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<DeliveryFilters>) => {
      if (getAllDeliveries) return;
      navigate({ filters });
    },
    [getAllDeliveries, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllDeliveries) return;
    navigate({
      filters: defaultDeliveryFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllDeliveries, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("deliveries_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deliveries",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["deliveries"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Add Delivery Mutation
  const { mutate: addDeliveryMutation, status: addDeliveryStatus } =
    useMutation({
      mutationFn: async ({ data }: { data: DeliveryFormValues }) =>
        addDelivery(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      },
    });

  // Edit Delivery Mutation
  const { mutate: editDeliveryMutation, status: editDeliveryStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: DeliveryFormValues;
      }) => editDelivery(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["deliveries"],
        });
      },
    });

  const { mutate: deleteDeliveryMutation, status: deleteDeliveryStatus } =
    useMutation({
      mutationFn: (id: string) => deleteDelivery(id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["deliveries"],
        });
        toast.success("Delivery deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting delivery:", error);
        toast.error("Failed to delete delivery");
      },
    });

  const {
    mutate: softDeleteDeliveryMutation,
    status: softDeleteDeliveryStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeleteDelivery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deliveries"],
      });
    },
  });

  return {
    deliveries: data?.documents || [],
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
    addDelivery: addDeliveryMutation,
    isAddingDelivery: addDeliveryStatus === "pending",
    editDelivery: editDeliveryMutation,
    isEditingDelivery: editDeliveryStatus === "pending",
    deleteDelivery: deleteDeliveryMutation,
    isDeletingDelivery: deleteDeliveryStatus === "pending",
    softDeleteDelivery: softDeleteDeliveryMutation,
    isSoftDeletingDelivery: softDeleteDeliveryStatus === "pending",
  };
};
