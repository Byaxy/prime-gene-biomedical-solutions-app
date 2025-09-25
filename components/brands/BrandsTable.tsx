"use client";

import { useBrands } from "@/hooks/useBrands";
import { useDebounce } from "@/hooks/useDebounce";
import { exportToExcel } from "@/lib/utils";
import { Brand } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "../table/DataTable";
import { brandColumns } from "../table/columns/brandColumns";

interface Props {
  initialData: { documents: Brand[]; total: number };
}

const BrandsTable = ({ initialData }: Props) => {
  const [rowSelection, setRowSelection] = useState({});

  const {
    brands,
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
  } = useBrands({ initialData });

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

  const handleDownloadSelected = async (selectedItems: Brand[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        imageId: item.imageId ?? "",
        imageUrl: item.imageUrl ?? "",
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-brands");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting brands:", error);
      toast.error("Failed to export brands");
    }
  };

  return (
    <div>
      <DataTable
        columns={brandColumns}
        data={brands || []}
        isLoading={isLoading}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onDownloadSelected={handleDownloadSelected}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        refetch={refetch}
        isFetching={isFetching}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
    </div>
  );
};

export default BrandsTable;
