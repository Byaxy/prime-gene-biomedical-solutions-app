"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { useStores } from "@/hooks/useStores";
import { exportToExcel } from "@/lib/utils";
import { Store } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "../table/DataTable";
import { storesColumns } from "../table/columns/storesColumns";

interface Props {
  initialData: { documents: Store[]; total: number };
}
const StoreTable = ({ initialData }: Props) => {
  const [rowSelection, setRowSelection] = useState({});
  const {
    stores,
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
  } = useStores({ initialData });

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

  const handleDownloadSelected = async (selectedItems: Store[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        location: item.location,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-stores");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting stores:", error);
      toast.error("Failed to export stores");
    }
  };

  return (
    <DataTable
      columns={storesColumns}
      data={stores || []}
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

export default StoreTable;
