"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import { RoleWithPermissions } from "@/types";
import { useRoles } from "@/hooks/useRoles";
import { rolesColumns } from "@/components/table/columns/rolesColumns";
import RoleDialog from "./RoleDialog";

interface RolesListTableProps {
  initialData: { documents: RoleWithPermissions[]; total: number };
}

const RolesListTable: React.FC<RolesListTableProps> = ({ initialData }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"view" | "delete">("view");
  const [selectedRow, setSelectedRow] = useState<RoleWithPermissions>(
    {} as RoleWithPermissions
  );

  const {
    roles,
    totalRoles,
    page,
    pageSize,
    search,
    isLoading,
    isFetching,
    setPage,
    setPageSize,
    setSearch,
    refetch,
  } = useRoles({ initialData });

  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = useCallback((rowData: RoleWithPermissions) => {
    setSelectedRow(rowData);
    setDialogMode("view");
    setOpenDialog(true);
  }, []);

  const handleSearchChange = useCallback((newSearch: string) => {
    setLocalSearch(newSearch);
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    setSearch("");
  }, [setSearch]);

  const closeDialog = useCallback(() => {
    setOpenDialog(false);
    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  }, []);

  return (
    <>
      <DataTable
        columns={rolesColumns}
        data={roles || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalRoles}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      {openDialog && (
        <RoleDialog
          mode={dialogMode}
          open={openDialog && !!selectedRow.role?.id}
          onOpenChange={closeDialog}
          role={selectedRow}
        />
      )}
    </>
  );
};

export default RolesListTable;
