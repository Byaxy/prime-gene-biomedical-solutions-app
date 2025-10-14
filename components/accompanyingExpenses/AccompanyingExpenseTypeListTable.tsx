"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import { useAccompanyingExpenseTypes } from "@/hooks/useAccompanyingExpenseTypes";
import { AccompanyingExpenseTypeWithRelations } from "@/types";
import { AccompanyingExpenseTypeFilters } from "@/lib/validation";
import { accompanyingExpenseTypesColumns } from "../table/columns/accompanyingExpenseTypesColumns";

interface AccompanyingExpenseTypeListTableProps {
  initialData: {
    documents: AccompanyingExpenseTypeWithRelations[];
    total: number;
  };
}

const AccompanyingExpenseTypeListTable: React.FC<
  AccompanyingExpenseTypeListTableProps
> = ({ initialData }) => {
  const {
    accompanyingExpenseTypes,
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
  } = useAccompanyingExpenseTypes({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search to URL/Tanstack Query
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
    (newFilters: AccompanyingExpenseTypeFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  return (
    <DataTable
      columns={accompanyingExpenseTypesColumns}
      data={accompanyingExpenseTypes || []}
      isLoading={isLoading}
      isFetching={isFetching}
      totalItems={totalItems}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      refetch={refetch}
      filterValues={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      searchTerm={localSearch}
      onSearchChange={handleSearchChange}
      onClearSearch={handleClearSearch}
    />
  );
};

export default AccompanyingExpenseTypeListTable;
