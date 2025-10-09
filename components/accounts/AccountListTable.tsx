"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import { useAccounts } from "@/hooks/useAccounts";
import { AccountType, AccountWithRelations } from "@/types";
import AccountDialog from "./AccountDialog";
import { AccountFilters } from "@/lib/validation";
import { accountsColumns } from "../table/columns/accountsColumns";

interface AccountListTableProps {
  initialData: { documents: AccountWithRelations[]; total: number };
}

const AccountListTable: React.FC<AccountListTableProps> = ({ initialData }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AccountWithRelations>(
    {} as AccountWithRelations
  );

  const {
    accounts,
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
  } = useAccounts({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search to URL/Tanstack Query
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = useCallback((rowData: AccountWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  }, []);

  const accountsFiltersConfig = {
    accountType: {
      type: "select" as const,
      label: "Account Type",
      options: Object.values(AccountType).map((item) => ({
        label: item.replace(/_/g, " "),
        value: item,
      })),
    },
  };

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
    (newFilters: AccountFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  // handle close dialog
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
        columns={accountsColumns}
        data={accounts || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={accountsFiltersConfig}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <AccountDialog
        mode={"view"}
        open={openDialog && !!selectedRow.account?.id}
        onOpenChange={closeDialog}
        account={selectedRow}
      />
    </>
  );
};

export default AccountListTable;
