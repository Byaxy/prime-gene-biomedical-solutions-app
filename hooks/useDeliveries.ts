"use client";

import {
  addDelivery,
  deleteDelivery,
  editDelivery,
  getDeliveries,
  softDeleteDelivery,
} from "@/lib/actions/delivery.actions";
import { DeliveryFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export interface DeliveryFilters {
  deliveryDate_start?: string;
  deliveryDate_end?: string;
  status?: string;
}

interface UseDeliveriesOptions {
  getAllDeliveries?: boolean;
  initialPageSize?: number;
}

export const defaultDeliveryFilters: DeliveryFilters = {
  deliveryDate_start: undefined,
  deliveryDate_end: undefined,
  status: undefined,
};

export const useDeliveries = ({
  getAllDeliveries = false,
  initialPageSize = 10,
}: UseDeliveriesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<DeliveryFilters>(
    defaultDeliveryFilters
  );

  const shouldFetchAll = getAllDeliveries;

  const isShowAllMode = pageSize === 0;

  // Query for all Deliveries
  const allDeliveriesQuery = useQuery({
    queryKey: ["deliveries", filters],
    queryFn: async () => {
      const result = await getDeliveries(0, 0, true, filters);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
  });

  // Query for paginated Deliveries
  const paginatedDeliveriesQuery = useQuery({
    queryKey: ["deliveries", "paginatedDeliveries", page, pageSize, filters],
    queryFn: async () => {
      const result = await getDeliveries(page, pageSize, false, filters);
      return result;
    },
    enabled: !shouldFetchAll && !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode
      ? allDeliveriesQuery
      : paginatedDeliveriesQuery;
  const deliveries =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
      paginatedDeliveriesQuery.data &&
      page * pageSize < paginatedDeliveriesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "deliveries",
          "paginatedDeliveries",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getDeliveries(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedDeliveriesQuery.data,
    queryClient,
    shouldFetchAll,
    isShowAllMode,
    filters,
  ]);
  // Handle filter changes
  const handleFilterChange = (newFilters: DeliveryFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };
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
          queryKey: ["deliveries", "paginatedDeliveries"],
        });
      },
    });

  const { mutate: deleteDeliveryMutation, status: deleteDeliveryStatus } =
    useMutation({
      mutationFn: (id: string) => deleteDelivery(id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["deliveries", "paginatedDeliveries"],
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
        queryKey: ["deliveries", "paginatedDeliveries"],
      });
    },
  });

  return {
    deliveries,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isFetching: activeQuery.isFetching,
    page,
    setPage,
    pageSize,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultDeliveryFilters,
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
