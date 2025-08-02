"use client";

import {
  addReceivedPurchase,
  deleteReceivedPurchase,
  editReceivedPurchase,
  getReceivedPurchases,
  softDeleteReceivedPurchase,
} from "@/lib/actions/receivingPurchases.actions";
import { ReceivingPurchaseFormValues } from "@/lib/validation";
import { ReceivedPurchaseWithRelations } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface UseReceivingPurchaseOptions {
  initialPageSize?: number;
  getAllReceivedPurchases?: boolean;
}

export interface ReceivedPurchaseFilters {
  totalAmount_min?: number;
  totalAmount_max?: number;
  receivingDate_start?: string;
  receivingDate_end?: string;
}

export const defaultFilters: ReceivedPurchaseFilters = {
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  receivingDate_start: undefined,
  receivingDate_end: undefined,
};

export const useReceivingPurchases = ({
  getAllReceivedPurchases = false,
  initialPageSize = 10,
}: UseReceivingPurchaseOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] =
    useState<ReceivedPurchaseFilters>(defaultFilters);

  // Query for all Purchases
  const allReceivedPurchasesQuery = useQuery({
    queryKey: ["receivedPurchases", "allReceivedPurchases", filters],
    queryFn: async () => {
      const result = await getReceivedPurchases(0, 0, true, filters);
      return result.documents;
    },
    enabled: getAllReceivedPurchases,
  });

  // Query for paginated Purchases
  const paginatedReceivedPurchasesQuery = useQuery({
    queryKey: [
      "receivedPurchases",
      "paginatedReceivedPurchases",
      page,
      pageSize,
      filters,
    ],
    queryFn: async () => {
      const result = await getReceivedPurchases(page, pageSize, false, filters);
      return result;
    },
    enabled: !getAllReceivedPurchases,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllReceivedPurchases &&
      paginatedReceivedPurchasesQuery.data &&
      page * pageSize < paginatedReceivedPurchasesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "receivedPurchases",
          "paginatedReceivedPurchases",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getReceivedPurchases(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedReceivedPurchasesQuery.data,
    queryClient,
    getAllReceivedPurchases,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: ReceivedPurchaseFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const {
    mutate: addReceivedPurchaseMutation,
    status: addReceivedPurchaseStatus,
  } = useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: ReceivingPurchaseFormValues;
      userId: string;
    }) => {
      return addReceivedPurchase(data, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["receivedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error creating received purchase:", error);
    },
  });

  const {
    mutate: editReceivedPurchaseMutation,
    status: editReceivedPurchaseStatus,
  } = useMutation({
    mutationFn: async ({
      id,
      data,
      userId,
    }: {
      id: string;
      data: ReceivingPurchaseFormValues;
      userId: string;
    }) => {
      return editReceivedPurchase(data, id, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["receivedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error updating received purchase:", error);
    },
  });

  const {
    mutate: softDeleteReceivedPurchaseMutation,
    status: softDeleteReceivedPurchaseStatus,
  } = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      softDeleteReceivedPurchase(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["receivedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error soft deleting Receivedpurchase:", error);
    },
  });

  const {
    mutate: deleteReceivedPurchaseMutation,
    status: deleteReceivedPurchaseStatus,
  } = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      deleteReceivedPurchase(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["receivedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error deleting received purchase:", error);
    },
  });

  return {
    receivedPurchases: getAllReceivedPurchases
      ? allReceivedPurchasesQuery.data
      : paginatedReceivedPurchasesQuery.data?.documents ||
        ([] as ReceivedPurchaseWithRelations[]),
    totalItems: paginatedReceivedPurchasesQuery.data?.total || 0,
    isLoading: getAllReceivedPurchases
      ? allReceivedPurchasesQuery.isLoading
      : paginatedReceivedPurchasesQuery.isLoading,
    error: getAllReceivedPurchases
      ? allReceivedPurchasesQuery.error
      : paginatedReceivedPurchasesQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultFilters,
    addReceivedPurchase: addReceivedPurchaseMutation,
    isCreatingReceivedPurchase: addReceivedPurchaseStatus === "pending",
    editReceivedPurchase: editReceivedPurchaseMutation,
    isEditingReceivedPurchase: editReceivedPurchaseStatus === "pending",
    softDeleteReceivedPurchase: softDeleteReceivedPurchaseMutation,
    isSoftDeletingReceivedPurchase:
      softDeleteReceivedPurchaseStatus === "pending",
    deleteReceivedPurchase: deleteReceivedPurchaseMutation,
    isDeletingReceivedPurchase: deleteReceivedPurchaseStatus === "pending",
    refetch: getAllReceivedPurchases
      ? allReceivedPurchasesQuery.refetch
      : paginatedReceivedPurchasesQuery.refetch,
    isRefetching: getAllReceivedPurchases
      ? allReceivedPurchasesQuery.isRefetching
      : paginatedReceivedPurchasesQuery.isRefetching,
  };
};
