"use client";

import {
  InventoryTransactionsFilters,
  useInventoryStockTransactions,
} from "@/hooks/useInventoryStockTransactions";
import {
  InventoryTransactionType,
  InventoryTransactionWithRelations,
  ProductWithRelations,
  Store,
} from "@/types";
import { DataTable } from "../table/DataTable";
import { inventoryTransactionsColumns } from "../table/columns/inventoryTransactionsColumns";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useStores } from "@/hooks/useStores";
import { useProducts } from "@/hooks/useProducts";

interface Props {
  initialData: {
    documents: InventoryTransactionWithRelations[];
    total: number;
  };
}

const InventoryTransactionsTable = ({ initialData }: Props) => {
  const { stores } = useStores({ getAllStores: true });
  const { products } = useProducts({ getAllActive: true });
  const {
    inventoryTransactions,
    totalItems,
    page,
    pageSize,
    search,
    filters,
    isLoading,
    isFetching,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetch,
  } = useInventoryStockTransactions({
    initialData,
  });
  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  // Event handlers
  const handleSearchChange = useCallback((newSearch: string) => {
    setLocalSearch(newSearch);
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    setSearch("");
  }, [setSearch]);

  const handleClearFilters = useCallback(() => {
    setLocalSearch("");
    setSearch("");
    clearFilters();
  }, [clearFilters, setSearch]);

  const handleFilterChange = useCallback(
    (newFilters: InventoryTransactionsFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  const inventoryTransactionsFilters = {
    productId: {
      type: "select" as const,
      label: "Product",
      options:
        products &&
        products.map((item: ProductWithRelations) => ({
          label: item.product.productID,
          value: item.product.id,
        })),
    },
    transactionDate: {
      type: "date" as const,
      label: "Transaction Date",
    },
    storeId: {
      type: "select" as const,
      label: "Store",
      options:
        stores &&
        stores.map((item: Store) => ({
          label: item.name,
          value: item.id,
        })),
    },
    transactionType: {
      type: "select" as const,
      label: "Transaction Type",
      options: Object.entries(InventoryTransactionType).map(([key, value]) => ({
        label: key,
        value,
      })),
    },
  };

  return (
    <DataTable
      columns={inventoryTransactionsColumns}
      data={inventoryTransactions || []}
      isLoading={isLoading}
      isFetching={isFetching}
      totalItems={totalItems}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      refetch={refetch}
      filters={inventoryTransactionsFilters}
      filterValues={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      searchTerm={localSearch}
      onSearchChange={handleSearchChange}
      onClearSearch={handleClearSearch}
    />
  );
};

export default InventoryTransactionsTable;
