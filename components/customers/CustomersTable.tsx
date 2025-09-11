"use client";

import { useCustomers } from "@/hooks/useCustomers";
import { DataTable } from "../table/DataTable";
import { customersColumns } from "../table/columns/customersColumns";
import { Customer } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  initialData?: { documents: Customer[]; total: number };
}

const CustomersTable = ({ initialData }: Props) => {
  const {
    customers,
    totalItems,
    page,
    pageSize,
    search,
    isLoading,
    isFetching,
    setPage,
    setPageSize,
    setSearch,
    refetch,
  } = useCustomers({ initialData });

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

  return (
    <DataTable
      columns={customersColumns}
      data={customers || []}
      isLoading={isLoading}
      totalItems={totalItems}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      refetch={refetch}
      isFetching={isFetching}
      searchTerm={localSearch}
      onSearchChange={handleSearchChange}
      onClearSearch={handleClearSearch}
    />
  );
};

export default CustomersTable;
