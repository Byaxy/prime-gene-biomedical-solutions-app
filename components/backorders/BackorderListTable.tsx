/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import { backorderColumns } from "@/components/table/columns/backorderColumns";
import {
  BackorderWithRelations,
  Customer,
  ProductWithRelations,
  SaleWithRelations,
} from "@/types";
import { useBackorders } from "@/hooks/useBackorders";
import { BackorderFilters } from "@/lib/actions/backorder.actions";

interface Props {
  initialData: { documents: BackorderWithRelations[]; total: number };
  allCustomers: Customer[];
  allProducts: ProductWithRelations[];
  allSales: SaleWithRelations[];
}

const BackorderListTable: React.FC<Props> = ({
  initialData,
  allCustomers,
  allProducts,
  allSales,
}) => {
  const {
    backorders,
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
  } = useBackorders({ initialData });

  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    if (debouncedSearch !== search) setSearch(debouncedSearch);
  }, [debouncedSearch, search, setSearch]);

  const backorderFiltersConfig = useMemo(
    () => ({
      saleId: {
        type: "select" as const,
        label: "Sale",
        options: allSales.map((s) => ({
          label: s.sale.invoiceNumber,
          value: s.sale.id,
        })),
      },
      customerId: {
        type: "select" as const,
        label: "Customer",
        options: allCustomers.map((c) => ({ label: c.name, value: c.id })),
      },
      productId: {
        type: "select" as const,
        label: "Product",
        options: allProducts.map((p) => ({
          label: p.product.name,
          value: p.product.id,
        })),
      },

      createdAt: {
        type: "date" as const,
        label: "Order Date",
      },
      pendingQuantity: {
        type: "number" as const,
        label: "Pending Quantity",
      },
    }),
    [allCustomers, allProducts, allSales]
  );

  const handleSearchChange = useCallback((s: string) => setLocalSearch(s), []);
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
    (f: Record<string, any>) => setFilters(f as BackorderFilters),
    [setFilters]
  );

  return (
    <>
      <DataTable
        columns={backorderColumns}
        data={backorders || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        refetch={refetch}
        filters={backorderFiltersConfig}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
    </>
  );
};

export default BackorderListTable;
