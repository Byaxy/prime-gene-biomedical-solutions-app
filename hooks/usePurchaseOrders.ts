import {
  addPurchaseOrder,
  deletePurchaseOrder,
  editPurchaseOrder,
  getPurchaseOrders,
  softDeletePurchaseOrder,
} from "@/lib/actions/purchaseOrder.actions";
import { PurchaseOrderFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UsePurchaseOrdersOptions {
  getAllPurchaseOrders?: boolean;
  initialPageSize?: number;
}

export interface PurchaseOrderFilters {
  totalAmount_min?: number;
  totalAmount_max?: number;
  purchaseOrderDate_start?: string;
  purchaseOrderDate_end?: string;
  status?: string;
}

export const defaultPurchaseOrderFilters: PurchaseOrderFilters = {
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  purchaseOrderDate_start: undefined,
  purchaseOrderDate_end: undefined,
  status: undefined,
};

export const usePurchaseOrders = ({
  getAllPurchaseOrders = false,
  initialPageSize = 10,
}: UsePurchaseOrdersOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<PurchaseOrderFilters>(
    defaultPurchaseOrderFilters
  );

  // Query for all Purchase orders
  const allPurchaseOrdersQuery = useQuery({
    queryKey: ["purchaseOrders", filters],
    queryFn: async () => {
      const result = await getPurchaseOrders(0, 0, true, filters);
      return result.documents;
    },
    enabled: getAllPurchaseOrders,
  });

  // Query for paginated Purchase orders
  const paginatedPurchaseOrdersQuery = useQuery({
    queryKey: [
      "purchaseOrders",
      "paginatedPurchaseOrders",
      page,
      pageSize,
      filters,
    ],
    queryFn: async () => {
      const result = await getPurchaseOrders(page, pageSize, false, filters);
      return result;
    },
    enabled: !getAllPurchaseOrders,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllPurchaseOrders &&
      paginatedPurchaseOrdersQuery.data &&
      page * pageSize < paginatedPurchaseOrdersQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "purchaseOrders",
          "paginatedPurchaseOrders",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getPurchaseOrders(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedPurchaseOrdersQuery.data,
    queryClient,
    getAllPurchaseOrders,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: PurchaseOrderFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const { mutate: addPurchaseOrderMutation, status: addPurchaseOrderStatus } =
    useMutation({
      mutationFn: async (data: PurchaseOrderFormValues) => {
        return addPurchaseOrder(data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["purchaseOrders", "paginatedPurchaseOrders"],
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
          queryKey: ["purchaseOrders", "paginatedPurchaseOrders"],
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
        queryKey: ["purchaseOrders", "paginatedPurchaseOrders"],
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
        queryKey: ["purchaseOrders", "paginatedPurchaseOrders"],
      });
    },
    onError: (error) => {
      console.error("Error deleting purchase order:", error);
      toast.error("Failed to delete purchase order");
    },
  });

  return {
    purchaseOrders: getAllPurchaseOrders
      ? allPurchaseOrdersQuery.data
      : paginatedPurchaseOrdersQuery.data?.documents || [],
    totalItems: paginatedPurchaseOrdersQuery.data?.total || 0,
    isLoading: getAllPurchaseOrders
      ? allPurchaseOrdersQuery.isLoading
      : paginatedPurchaseOrdersQuery.isLoading,
    error: getAllPurchaseOrders
      ? allPurchaseOrdersQuery.error
      : paginatedPurchaseOrdersQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultPurchaseOrderFilters,
    addPurchaseOrder: addPurchaseOrderMutation,
    isCreatingPurchaseOrder: addPurchaseOrderStatus === "pending",
    editPurchaseOrder: editPurchaseOrderMutation,
    isEditingPurchaseOrder: editPurchaseOrderStatus === "pending",
    softDeletePurchaseOrder: softDeletePurchaseOrderMutation,
    isSoftDeletingPurchaseOrder: softDeletePurchaseOrderStatus === "pending",
    deletePurchaseOrder: deletePurchaseOrderMutation,
    isDeletingPurchaseOrder: deletePurchaseOrderStatus === "pending",
    refetch: getAllPurchaseOrders
      ? allPurchaseOrdersQuery.refetch
      : paginatedPurchaseOrdersQuery.refetch,
    isRefetching: getAllPurchaseOrders
      ? allPurchaseOrdersQuery.isRefetching
      : paginatedPurchaseOrdersQuery.isRefetching,
  };
};
