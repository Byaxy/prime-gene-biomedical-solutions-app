"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";

import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import {
  ChartOfAccountWithRelations,
  ExpenseCategoryWithRelations,
} from "@/types";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { ExpenseCategoryFilters } from "@/lib/validation";
import { expenseCategoriesColumns } from "../table/columns/expenseCategoriesColumns";

interface ExpenseCategoryListTableProps {
  initialData: { documents: ExpenseCategoryWithRelations[]; total: number };
}

const ExpenseCategoryListTable: React.FC<ExpenseCategoryListTableProps> = ({
  initialData,
}) => {
  const {
    expenseCategories,
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
  } = useExpenseCategories({ initialData });

  const { chartOfAccounts: allChartOfAccounts } = useChartOfAccounts({
    getAllCoAs: true,
  });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search to URL/Tanstack Query
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const expenseCategoryFilters = useMemo(
    () => ({
      parentId: {
        type: "select" as const,
        label: "Parent Category",
        options: expenseCategories.map(
          (item: ExpenseCategoryWithRelations) => ({
            label: item.expenseCategory.name,
            value: item.expenseCategory.id,
          })
        ),
      },
      chartOfAccountsId: {
        type: "select" as const,
        label: "Linked CoA",
        options: allChartOfAccounts.map((coa: ChartOfAccountWithRelations) => ({
          label: coa.account.accountName,
          value: coa.account.id,
        })),
      },
    }),
    [expenseCategories, allChartOfAccounts]
  );

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
    (newFilters: ExpenseCategoryFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  return (
    <DataTable
      columns={expenseCategoriesColumns}
      data={expenseCategories || []}
      isLoading={isLoading}
      isFetching={isFetching}
      totalItems={totalItems}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      refetch={refetch}
      filters={expenseCategoryFilters}
      filterValues={filters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      searchTerm={localSearch}
      onSearchChange={handleSearchChange}
      onClearSearch={handleClearSearch}
    />
  );
};

export default ExpenseCategoryListTable;
