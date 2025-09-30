import {
  addPurchaseOrder,
  deletePurchaseOrder,
  editPurchaseOrder,
  getPurchaseOrders,
  softDeletePurchaseOrder,
} from "@/lib/actions/purchaseOrder.actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PurchaseOrderFormValues } from "@/lib/validation";
import { PurchaseOrderWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useTransition } from "react";
import toast from "react-hot-toast";

interface UsePurchaseOrdersOptions {
  getAllPurchaseOrders?: boolean;
  initialData?: { documents: PurchaseOrderWithRelations[]; total: number };
}

export interface PurchaseOrderFilters {
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  purchaseOrderDate_start?: string;
  purchaseOrderDate_end?: string;
  status?: string;
  isConvertedToPurchase?: boolean;
}

export const defaultPurchaseOrderFilters: PurchaseOrderFilters = {
  search: undefined,
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  purchaseOrderDate_start: undefined,
  purchaseOrderDate_end: undefined,
  status: undefined,
  isConvertedToPurchase: undefined,
};

export const usePurchaseOrders = ({
  getAllPurchaseOrders = false,
  initialData,
}: UsePurchaseOrdersOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Parse current state from URL - single source of truth
  const currentState = useMemo(() => {
    if (getAllPurchaseOrders) {
      return {
        page: 0,
        pageSize: 0,
        search: "",
      };
    }

    const page = Number(searchParams.get("page") || 0);
    const pageSize = Number(searchParams.get("pageSize") || 10);
    const search = searchParams.get("search") || "";

    const filters: PurchaseOrderFilters = {
      search: search || undefined,
      totalAmount_min: searchParams.get("totalAmount_min")
        ? Number(searchParams.get("totalAmount_min"))
        : undefined,
      totalAmount_max: searchParams.get("totalAmount_max")
        ? Number(searchParams.get("totalAmount_max"))
        : undefined,

      status: searchParams.get("status") || undefined,
      purchaseOrderDate_start:
        searchParams.get("purchaseOrderDate_start") || undefined,
      purchaseOrderDate_end:
        searchParams.get("purchaseOrderDate_end") || undefined,
      isConvertedToPurchase: searchParams.get("isConvertedToPurchase")
        ? searchParams.get("isConvertedToPurchase") === "true"
        : undefined,
    };

    return { page, pageSize, filters, search };
  }, [getAllPurchaseOrders, searchParams]);

  // Create stable query key
  const queryKey = useMemo(() => {
    const { page, pageSize, filters } = currentState;
    const filterString = JSON.stringify(filters);
    return ["purchaseOrders", page, pageSize, filterString];
  }, [currentState]);

  // Main query with server state
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { page, pageSize, filters } = currentState;
      return getPurchaseOrders(
        page,
        pageSize,
        getAllPurchaseOrders || pageSize === 0,
        filters
      );
    },
    initialData: initialData ? () => initialData : undefined,
    staleTime: getAllPurchaseOrders ? 60000 : 30000,
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
        filters: Partial<PurchaseOrderFilters>;
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
        Object.keys(defaultPurchaseOrderFilters).forEach((key) =>
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
      const newFilters: PurchaseOrderFilters = {
        search: newParams.get("search") || undefined,
        totalAmount_min: newParams.get("totalAmount_min")
          ? Number(newParams.get("totalAmount_min"))
          : undefined,
        totalAmount_max: newParams.get("totalAmount_max")
          ? Number(newParams.get("totalAmount_max"))
          : undefined,

        status: newParams.get("status") || undefined,
        purchaseOrderDate_start:
          newParams.get("purchaseOrderDate_start") || undefined,
        purchaseOrderDate_end:
          newParams.get("purchaseOrderDate_end") || undefined,
        isConvertedToPurchase: newParams.get("isConvertedToPurchase")
          ? newParams.get("isConvertedToPurchase") === "true"
          : undefined,
      };

      const newQueryKey = [
        "purchaseOrders",
        newPage,
        newPageSize,
        JSON.stringify(newFilters),
      ];

      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: () =>
          getPurchaseOrders(
            newPage,
            newPageSize,
            newPageSize === 0,
            newFilters
          ),
      });
    },
    [router, searchParams, queryClient]
  );

  const setPage = useCallback(
    (page: number) => {
      if (getAllPurchaseOrders) return;
      navigate({ page });
    },
    [getAllPurchaseOrders, navigate]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (getAllPurchaseOrders) return;
      navigate({ pageSize, page: 0 });
    },
    [getAllPurchaseOrders, navigate]
  );

  const setSearch = useCallback(
    (search: string) => {
      if (getAllPurchaseOrders) return;
      navigate({ search });
    },
    [getAllPurchaseOrders, navigate]
  );

  const setFilters = useCallback(
    (filters: Partial<PurchaseOrderFilters>) => {
      if (getAllPurchaseOrders) return;
      navigate({ filters });
    },
    [getAllPurchaseOrders, navigate]
  );

  const clearFilters = useCallback(() => {
    if (getAllPurchaseOrders) return;
    navigate({
      filters: defaultPurchaseOrderFilters,
      search: "",
      page: 0,
      pageSize: 10,
    });
  }, [getAllPurchaseOrders, navigate]);

  // Real-time updates
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("purchase_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchase_orders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { mutate: addPurchaseOrderMutation, status: addPurchaseOrderStatus } =
    useMutation({
      mutationFn: async (data: PurchaseOrderFormValues) => {
        return addPurchaseOrder(data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["purchaseOrders"],
        });
      },
      onError: (error) => {
        console.error("Error creating purchase order:", error);
      },
    });

  const { mutate: editPurchaseOrderMutation, status: editPurchaseOrderStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: PurchaseOrderFormValues;
      }) => {
        return editPurchaseOrder(data, id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["purchaseOrders"],
        });
      },
      onError: (error) => {
        console.error("Error updating purchase order:", error);
      },
    });

  const {
    mutate: softDeletePurchaseOrderMutation,
    status: softDeletePurchaseOrderStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrders"],
      });
    },
    onError: (error) => {
      console.error("Error soft deleting purchase:", error);
    },
  });

  const {
    mutate: deletePurchaseOrderMutation,
    status: deletePurchaseOrderStatus,
  } = useMutation({
    mutationFn: (id: string) => deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrders"],
      });
    },
    onError: (error) => {
      console.error("Error deleting purchase order:", error);
      toast.error("Failed to delete purchase order");
    },
  });

  return {
    purchaseOrders: data?.documents || [],
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
    addPurchaseOrder: addPurchaseOrderMutation,
    isCreatingPurchaseOrder: addPurchaseOrderStatus === "pending",
    editPurchaseOrder: editPurchaseOrderMutation,
    isEditingPurchaseOrder: editPurchaseOrderStatus === "pending",
    softDeletePurchaseOrder: softDeletePurchaseOrderMutation,
    isSoftDeletingPurchaseOrder: softDeletePurchaseOrderStatus === "pending",
    deletePurchaseOrder: deletePurchaseOrderMutation,
    isDeletingPurchaseOrder: deletePurchaseOrderStatus === "pending",
  };
};
