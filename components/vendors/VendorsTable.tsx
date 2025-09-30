"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { useVendors } from "@/hooks/useVendors";
import { exportToExcel } from "@/lib/utils";
import { Vendor } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "../table/DataTable";
import { vendorsColumns } from "../table/columns/vendorsColumns";

interface Props {
  initialData: { documents: Vendor[]; total: number };
}
const VendorsTable = ({ initialData }: Props) => {
  const [rowSelection, setRowSelection] = useState({});
  const {
    vendors,
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
  } = useVendors({ initialData });

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

  const handleDownloadSelected = async (selectedItems: Vendor[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        address: item.address ?? "",
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-vendors");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting vendors:", error);
      toast.error("Failed to export vendors");
    }
  };

  return (
    <DataTable
      columns={vendorsColumns}
      data={vendors || []}
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

export default VendorsTable;
