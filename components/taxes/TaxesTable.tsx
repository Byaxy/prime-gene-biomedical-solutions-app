"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { useTaxes } from "@/hooks/useTaxes";
import { exportToExcel } from "@/lib/utils";
import { Tax } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "../table/DataTable";
import { taxColumns } from "../table/columns/taxColumns";

interface Props {
  initialData: { documents: Tax[]; total: number };
}
const TaxesTable = ({ initialData }: Props) => {
  const [rowSelection, setRowSelection] = useState({});
  const {
    taxes,
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
  } = useTaxes({ initialData });

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

  const handleDownloadSelected = async (selectedItems: Tax[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        taxRate: `${item.taxRate}%`,
        code: item.code,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-taxes");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting taxes:", error);
      toast.error("Failed to export taxes");
    }
  };

  return (
    <DataTable
      columns={taxColumns}
      data={taxes || []}
      isLoading={isLoading}
      totalItems={totalItems}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      onDownloadSelected={handleDownloadSelected}
      refetch={refetch}
      isFetching={isFetching}
      searchTerm={localSearch}
      onSearchChange={handleSearchChange}
      onClearSearch={handleClearSearch}
    />
  );
};

export default TaxesTable;
