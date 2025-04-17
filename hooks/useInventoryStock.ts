"use client";

import { useEffect, useState } from "react";
import {
  addInventoryStock,
  adjustInventoryStock,
  getInventoryStock,
  getInventoryTransactions,
} from "@/lib/actions/inventoryStock.actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExtendedStockAdjustmentFormValues } from "@/components/forms/NewStockForm";
import { InventoryStockWithRelations } from "@/types";
import { ExistingStockAdjustmentFormValues } from "@/lib/validation";

interface UseInventoryStockOptions {
  getAllInventoryStocks?: boolean;
  initialPageSize?: number;
}
interface InventoryStockFilters {
  quantity_min?: number;
  quantity_max?: number;
  costPrice_min?: number;
  costPrice_max?: number;
  sellingPrice_min?: number;
  sellingPrice_max?: number;
  expiryDate_start?: string;
  expiryDate_end?: string;
  manufactureDate_start?: string;
  manufactureDate_end?: string;
  store?: string;
}

export const defaultInventoryStockFilters: InventoryStockFilters = {
  quantity_min: undefined,
  quantity_max: undefined,
  costPrice_min: undefined,
  costPrice_max: undefined,
  sellingPrice_min: undefined,
  sellingPrice_max: undefined,
  expiryDate_start: undefined,
  expiryDate_end: undefined,
  manufactureDate_start: undefined,
  manufactureDate_end: undefined,
  store: undefined,
};

export const useInventoryStock = ({
  getAllInventoryStocks = false,
  initialPageSize = 10,
}: UseInventoryStockOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<InventoryStockFilters>(
    defaultInventoryStockFilters
  );

  // Query for all inventory stock
  const allInventoryStockQuery = useQuery({
    queryKey: ["inventory-stock", "allInventoryStock", filters],
    queryFn: async () => {
      const result = await getInventoryStock(0, 0, true, filters);
      return result.documents;
    },
    enabled: getAllInventoryStocks,
  });

  // Query for paginated inventory stock
  const paginatedInventoryStockQuery = useQuery({
    queryKey: [
      "inventory-stock",
      "paginatedInventoryStock",
      page,
      pageSize,
      filters,
    ],
    queryFn: async () => {
      const result = await getInventoryStock(page, pageSize, false, filters);
      return result;
    },
    enabled: !getAllInventoryStocks,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllInventoryStocks &&
      paginatedInventoryStockQuery.data &&
      page * pageSize < paginatedInventoryStockQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "inventory-stock",
          "paginatedInventoryStock",
          page + 1,
          pageSize,
          filters,
        ],
        queryFn: () => getInventoryStock(page + 1, pageSize, false, filters),
      });
    }
  }, [
    page,
    pageSize,
    paginatedInventoryStockQuery.data,
    queryClient,
    getAllInventoryStocks,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: InventoryStockFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Add inventory stock mutation
  const {
    mutateAsync: addInventoryStockMutation,
    status: addInventoryStockStatus,
  } = useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: ExtendedStockAdjustmentFormValues;
      userId: string;
    }) => {
      const result = await addInventoryStock(data, userId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
    },
  });

  // Add this query for inventory transactions
  const inventoryTransactionsQuery = useQuery({
    queryKey: ["inventory-transactions", "allTransactions"],
    queryFn: async () => {
      const result = await getInventoryTransactions(0, 0, true);
      return result.documents;
    },
  });

  // Add this filtered transactions query
  const getFilteredTransactions = useMutation({
    mutationFn: async (filters: {
      productId?: string;
      storeId?: string;
      transactionType?: string;
      startDate?: Date;
      endDate?: Date;
    }) => {
      const result = await getInventoryTransactions(0, 0, true, filters);
      return result.documents;
    },
  });

  // Adjust inventory stock mutation
  const {
    mutateAsync: adjustInventoryStockMutation,
    status: adjustInventoryStockStatus,
  } = useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: ExistingStockAdjustmentFormValues;
      userId: string;
    }) => {
      const result = await adjustInventoryStock(data, userId);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "inventory-stock",
          "inventory-transactions",
          "allTransactions",
          "paginatedInventoryStock",
        ],
      });
    },
  });

  return {
    inventoryStock: getAllInventoryStocks
      ? allInventoryStockQuery.data
      : paginatedInventoryStockQuery.data?.documents ||
        ([] as InventoryStockWithRelations[]),
    totalItems: paginatedInventoryStockQuery.data?.total || 0,
    isLoading: getAllInventoryStocks
      ? allInventoryStockQuery.isLoading
      : paginatedInventoryStockQuery.isLoading,
    error: getAllInventoryStocks
      ? allInventoryStockQuery.error
      : paginatedInventoryStockQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultInventoryStockFilters,
    addInventoryStock: addInventoryStockMutation,
    isAddingInventoryStock: addInventoryStockStatus === "pending",
    adjustInventoryStock: adjustInventoryStockMutation,
    isAdjustingInventoryStock: adjustInventoryStockStatus === "pending",
    inventoryTransactions: inventoryTransactionsQuery.data || [],
    getFilteredTransactions: getFilteredTransactions.mutateAsync,
    isFetchingTransactions: inventoryTransactionsQuery.isLoading,
    isFilteringTransactions: getFilteredTransactions.isPending,
  };
};
