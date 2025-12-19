/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import { ReceiptWithRelations, Customer } from "@/types";
import { ReceiptFilters } from "@/lib/validation";
import { useReceipts } from "@/hooks/useReceipts";

import { receiptColumns } from "@/components/table/columns/receiptColumns";
import ReceiptDialog from "./ReceiptDialog";

interface ReceiptListTableProps {
  initialData: { documents: ReceiptWithRelations[]; total: number };
  allCustomers: Customer[];
}

const ReceiptListTable: React.FC<ReceiptListTableProps> = ({
  initialData,
  allCustomers,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ReceiptWithRelations>(
    {} as ReceiptWithRelations
  );
  const [dialogMode, setDialogMode] = useState<"view" | "delete">("view");

  const {
    receipts,
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
  } = useReceipts({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search to URL/Tanstack Query
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  // Handle row click to open dialog
  const handleRowClick = useCallback((rowData: ReceiptWithRelations) => {
    setSelectedRow(rowData);
    setDialogMode("view");
    setOpenDialog(true);
  }, []);

  // Configuration for dynamic filters
  const receiptFiltersConfig = useMemo(
    () => ({
      customerId: {
        type: "select" as const,
        label: "Customer",
        options: allCustomers.map((customer) => ({
          label: customer.name,
          value: customer.id,
        })),
      },
      receiptNumber: {
        type: "text" as const,
        label: "Receipt Number",
      },
      receiptDate: {
        type: "date" as const,
        label: "Receipt Date",
      },
      totalAmountReceived: {
        type: "number" as const,
        label: "Amount Received",
      },
    }),
    [allCustomers]
  );

  // Event handlers for DataTable
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
    (newFilters: Record<string, any>) => {
      setFilters(newFilters as ReceiptFilters);
    },
    [setFilters]
  );

  // Close dialog handler
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
        columns={receiptColumns}
        data={receipts || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={receiptFiltersConfig}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <ReceiptDialog
        mode={dialogMode}
        open={openDialog && !!selectedRow.receipt?.id}
        onOpenChange={closeDialog}
        receipt={selectedRow}
      />
    </>
  );
};

export default ReceiptListTable;
