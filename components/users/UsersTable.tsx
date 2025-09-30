"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { useUsers } from "@/hooks/useUsers";
import { exportToExcel } from "@/lib/utils";
import { User } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "../table/DataTable";
import { usersColumns } from "../table/columns/usersColumns";

interface Props {
  initialData: { documents: User[]; total: number };
}
const UsersTable = ({ initialData }: Props) => {
  const [rowSelection, setRowSelection] = useState({});
  const {
    users,
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
  } = useUsers({ initialData });

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

  const handleDownloadSelected = async (selectedItems: User[]) => {
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
        role: item.role,
        profileImageId: item.profileImageId ?? "",
        profileImageUrl: item.profileImageUrl ?? "",
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-users");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting users:", error);
      toast.error("Failed to export users");
    }
  };

  return (
    <DataTable
      columns={usersColumns}
      data={users || []}
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

export default UsersTable;
