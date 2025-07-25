"use client";

import {
  addPurchase,
  editPurchase,
  getPurchases,
  deletePurchase,
  softDeletePurchase,
} from "@/lib/actions/purchase.actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PurchaseFormValues } from "@/lib/validation";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

interface UsePurchasesOptions {
  getAllPurchases?: boolean;
  initialPageSize?: number;
}

export interface PurchaseFilters {
  totalAmount_min?: number;
  totalAmount_max?: number;
  purchaseDate_start?: string;
  purchaseDate_end?: string;
  status?: string;
}

export const defaultPurchaseFilters: PurchaseFilters = {
  totalAmount_min: undefined,
  totalAmount_max: undefined,
  purchaseDate_start: undefined,
  purchaseDate_end: undefined,
  status: undefined,
};

export const usePurchases = ({
  getAllPurchases = false,
  initialPageSize = 10,
}: UsePurchasesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<PurchaseFilters>(
    defaultPurchaseFilters
  );

  // Query for all Purchases
  const allPurchasesQuery = useQuery({
    queryKey: ["purchases", "allPurchases", filters],
    queryFn: async () => {
      const result = await getPurchases(0, 0, true, filters);
      return result.documents;
    },
    enabled: getAllPurchases,
  });

  // Query for paginated Purchases
  const paginatedPurchasesQuery = useQuery({
    queryKey: ["purchases", "paginatedPurchases", page, pageSize, filters],
    queryFn: async () => {
      const result = await getPurchases(page, pageSize, false, filters);
      return result;
    },
    enabled: !getAllPurchases,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllPurchases &&
      paginatedPurchasesQuery.data &&
      page * pageSize < paginatedPurchasesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "purchases",
          "paginatedPurchases",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getPurchases(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedPurchasesQuery.data,
    queryClient,
    getAllPurchases,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: PurchaseFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const { mutate: addPurchaseMutation, status: addPurchaseStatus } =
    useMutation({
      mutationFn: async (data: PurchaseFormValues) => {
        return addPurchase(data);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["purchases", "allPurchases", "paginatedPurchases"],
        });
      },
      onError: (error) => {
        console.error("Error creating purchase:", error);
      },
    });

  const { mutate: editPurchaseMutation, status: editPurchaseStatus } =
    useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: PurchaseFormValues;
      }) => {
        return editPurchase(data, id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["purchases", "allPurchases", "paginatedPurchases"],
        });
      },
      onError: (error) => {
        console.error("Error updating purchase:", error);
      },
    });

  const {
    mutate: softDeletePurchaseMutation,
    status: softDeletePurchaseStatus,
  } = useMutation({
    mutationFn: (id: string) => softDeletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchases", "allPurchases", "paginatedPurchases"],
      });
    },
    onError: (error) => {
      console.error("Error soft deleting purchase:", error);
    },
  });

  const { mutate: deletePurchaseMutation, status: deletePurchaseStatus } =
    useMutation({
      mutationFn: (id: string) => deletePurchase(id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["purchases", "allPurchases", "paginatedPurchases"],
        });
      },
      onError: (error) => {
        console.error("Error deleting purchase:", error);
        toast.error("Failed to delete purchase");
      },
    });

  return {
    purchases: getAllPurchases
      ? allPurchasesQuery.data
      : paginatedPurchasesQuery.data?.documents || [],
    totalItems: paginatedPurchasesQuery.data?.total || 0,
    isLoading: getAllPurchases
      ? allPurchasesQuery.isLoading
      : paginatedPurchasesQuery.isLoading,
    error: getAllPurchases
      ? allPurchasesQuery.error
      : paginatedPurchasesQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultPurchaseFilters,
    addPurchase: addPurchaseMutation,
    isCreatingPurchase: addPurchaseStatus === "pending",
    editPurchase: editPurchaseMutation,
    isEditingPurchase: editPurchaseStatus === "pending",
    softDeletePurchase: softDeletePurchaseMutation,
    isSoftDeletingPurchase: softDeletePurchaseStatus === "pending",
    deletePurchase: deletePurchaseMutation,
    isDeletingPurchase: deletePurchaseStatus === "pending",
    refetch: getAllPurchases
      ? allPurchasesQuery.refetch
      : paginatedPurchasesQuery.refetch,
    isRefetching: getAllPurchases
      ? allPurchasesQuery.isRefetching
      : paginatedPurchasesQuery.isRefetching,
  };
};
