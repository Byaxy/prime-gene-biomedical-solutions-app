"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";

import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { IncomeCategoryWithRelations } from "@/types";
import { IncomeCategoryFilters } from "@/lib/validation";
import { incomeCategoriesColumns } from "../table/columns/incomeCategoriesColumns";

interface IncomeCategoryListTableProps {
  initialData: { documents: IncomeCategoryWithRelations[]; total: number };
}

const IncomeCategoryListTable: React.FC<IncomeCategoryListTableProps> = ({
  initialData,
}) => {
  const {
    incomeCategories,
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
  } = useIncomeCategories({ initialData });

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
    (newFilters: IncomeCategoryFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  return (
    <DataTable
      columns={incomeCategoriesColumns}
      data={incomeCategories || []}
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

export default IncomeCategoryListTable;
