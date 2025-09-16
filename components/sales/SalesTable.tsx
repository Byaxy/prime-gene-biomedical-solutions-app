"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { SaleFilters, useSales } from "@/hooks/useSales";
import { PaymentStatus, SaleStatus, SaleWithRelations } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../table/DataTable";
import { salesColumns } from "../table/columns/salesColumns";
import SaleDialog from "./SaleDialog";

interface Props {
  initialData: { documents: SaleWithRelations[]; total: number };
}

const SalesTable = ({ initialData }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SaleWithRelations>(
    {} as SaleWithRelations
  );

  const {
    sales,
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
  } = useSales({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = (rowData: SaleWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  };

  const salesFilters = {
    totalAmount: {
      type: "number" as const,
      label: "Grand Total",
    },
    amountPaid: {
      type: "number" as const,
      label: "Amount Paid",
    },
    saleDate: {
      type: "date" as const,
      label: "Sale Date",
    },
    status: {
      type: "select" as const,
      label: "Sale Status",
      options: Object.values(SaleStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
    paymentStatus: {
      type: "select" as const,
      label: "Payment Status",
      options: Object.values(PaymentStatus).map((item) => ({
        label: item,
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
    (newFilters: SaleFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );
  // handle close dialog
  const closeDialog = () => {
    setOpenDialog(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

  return (
    <>
      <DataTable
        columns={salesColumns}
        data={sales || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={salesFilters}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <SaleDialog
        mode={"view"}
        open={openDialog && !!selectedRow}
        onOpenChange={closeDialog}
        sale={selectedRow}
      />
    </>
  );
};

export default SalesTable;
