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
import { ExistingStockAdjustmentFormValues } from "@/lib/validation";

interface UseInventoryStockOptions {
  getAllInventoryStocks?: boolean;
  initialPageSize?: number;
  getAllTransactions?: boolean;
}
export interface InventoryStockFilters {
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

export interface InventoryTransactionsFilters {
  productId?: string;
  storeId?: string;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
}

export const defaultTransactionFilters: InventoryTransactionsFilters = {
  productId: undefined,
  storeId: undefined,
  transactionType: undefined,
  startDate: undefined,
  endDate: undefined,
};

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
  getAllTransactions = false,
  initialPageSize = 10,
}: UseInventoryStockOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<InventoryStockFilters>(
    defaultInventoryStockFilters
  );
  const [transactionFilters, setTransactionFilters] =
    useState<InventoryTransactionsFilters>(defaultTransactionFilters);

  const shouldFetchAll = getAllInventoryStocks;

  const shouldFetchAllTransactions = getAllTransactions;

  const isShowAllMode = pageSize === 0;

  // Query for all inventory transactions
  const allInventoryTransactionsQuery = useQuery({
    queryKey: ["inventory-transactions", transactionFilters],
    queryFn: async () => {
      const result = await getInventoryTransactions(
        0,
        0,
        true,
        transactionFilters
      );
      return result.documents;
    },
    enabled: shouldFetchAllTransactions || isShowAllMode,
  });

  // Query for paginated inventory transactions
  const paginatedInventoryTransactionsQuery = useQuery({
    queryKey: [
      "inventory-transactions",
      "paginatedInventoryTransactions",
      page,
      pageSize,
      transactionFilters,
    ],
    queryFn: async () => {
      const result = await getInventoryTransactions(
        page,
        pageSize,
        false,
        transactionFilters
      );
      return result;
    },
    enabled: !shouldFetchAllTransactions && !isShowAllMode,
  });

  // Determine which query data to use
  const activeTransactionsQuery =
    shouldFetchAllTransactions || isShowAllMode
      ? allInventoryTransactionsQuery
      : paginatedInventoryTransactionsQuery;
  const inventoryTransactions = activeTransactionsQuery.data?.documents || [];
  const totalTransactions = activeTransactionsQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAllTransactions &&
      !isShowAllMode &&
      paginatedInventoryTransactionsQuery.data
    ) {
      queryClient.prefetchQuery({
        queryKey: [
          "inventory-transactions",
          "paginatedInventoryTransactions",
          page + 1,
          pageSize,
          transactionFilters,
        ],
        queryFn: async () => {
          const result = await getInventoryTransactions(
            page + 1,
            pageSize,
            false,
            transactionFilters
          );
          return result;
        },
      });
    }
  }, [
    queryClient,
    page,
    pageSize,
    shouldFetchAllTransactions,
    isShowAllMode,
    paginatedInventoryTransactionsQuery.data,
    transactionFilters,
  ]);

  // handle transaction filter changes
  const handleTransactionFilterChange = (
    newFilters: InventoryTransactionsFilters
  ) => {
    setTransactionFilters(newFilters);
    setPage(0);
  };

  // Query for all inventory stock
  const allInventoryStockQuery = useQuery({
    queryKey: ["inventory-stock", filters],
    queryFn: async () => {
      const result = await getInventoryStock(0, 0, true, filters);
      return result.documents;
    },
    enabled: shouldFetchAll || isShowAllMode,
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
    enabled: !shouldFetchAll && !isShowAllMode,
  });

  // Determine which query data to use
  const activeQuery =
    shouldFetchAll || isShowAllMode
      ? allInventoryStockQuery
      : paginatedInventoryStockQuery;
  const inventoryStock =
    (shouldFetchAll || isShowAllMode
      ? activeQuery.data
      : activeQuery.data?.documents) || [];
  const totalItems = activeQuery.data?.total || 0;

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !shouldFetchAll &&
      !isShowAllMode &&
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
    shouldFetchAll,
    isShowAllMode,
    filters,
  ]);

  // Handle filter changes
  const handleFilterChange = (newFilters: InventoryStockFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Handle page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
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
    inventoryStock,
    totalItems,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    setPageSize: handlePageSizeChange,
    refetch: activeQuery.refetch,
    isRefetching: activeQuery.isRefetching,
    page,
    setPage,
    pageSize,
    filters,
    onFilterChange: handleFilterChange,
    defaultFilterValues: defaultInventoryStockFilters,
    addInventoryStock: addInventoryStockMutation,
    isAddingInventoryStock: addInventoryStockStatus === "pending",
    adjustInventoryStock: adjustInventoryStockMutation,
    isAdjustingInventoryStock: adjustInventoryStockStatus === "pending",
    inventoryTransactions,
    totalTransactions,
    isTransactionsLoading: activeTransactionsQuery.isLoading,
    transactionsError: activeTransactionsQuery.error,
    setTransactionFilters: handleTransactionFilterChange,
    refetchTransactions: activeTransactionsQuery.refetch,
    isRefetchingTransactions: activeTransactionsQuery.isRefetching,
    transactionFilters,
  };
};
