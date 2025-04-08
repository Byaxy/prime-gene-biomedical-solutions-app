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

export const useInventoryStock = ({
  getAllInventoryStocks = false,
  initialPageSize = 10,
}: UseInventoryStockOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all inventory stock
  const allInventoryStockQuery = useQuery({
    queryKey: ["inventory-stock", "allInventoryStock"],
    queryFn: async () => {
      const result = await getInventoryStock(0, 0, true);
      return result.documents;
    },
    enabled: getAllInventoryStocks,
  });

  // Query for paginated inventory stock
  const paginatedInventoryStockQuery = useQuery({
    queryKey: ["inventory-stock", "paginatedInventoryStock", page, pageSize],
    queryFn: async () => {
      const result = await getInventoryStock(page, pageSize, false);
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
        ],
        queryFn: () => getInventoryStock(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedInventoryStockQuery.data,
    queryClient,
    getAllInventoryStocks,
  ]);

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
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
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
