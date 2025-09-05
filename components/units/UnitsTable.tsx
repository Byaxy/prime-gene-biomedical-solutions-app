"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { useDialogState } from "@/hooks/useDialogState";
import { useUnits } from "@/hooks/useUnits";
import { exportToExcel } from "@/lib/utils";
import { Unit } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "../table/DataTable";
import UnitsDialog from "./UnitsDialog";
import { unitsColumns } from "../table/columns/unitsColumns";

interface Props {
  initialData: { documents: Unit[]; total: number };
}

const UnitsTable = ({ initialData }: Props) => {
  const [rowSelection, setRowSelection] = useState({});
  const {
    units,
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
  } = useUnits({ initialData });

  const { isOpen, openDialog, closeDialog } = useDialogState();

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

  const handleDownloadSelected = async (selectedItems: Unit[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        code: item.code,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-units");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting units:", error);
      toast.error("Failed to export units");
    }
  };

  return (
    <div>
      <DataTable
        columns={unitsColumns}
        data={units || []}
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
      <UnitsDialog
        mode="add"
        open={isOpen}
        onOpenChange={(open) => (open ? openDialog() : closeDialog())}
      />
    </div>
  );
};

export default UnitsTable;
