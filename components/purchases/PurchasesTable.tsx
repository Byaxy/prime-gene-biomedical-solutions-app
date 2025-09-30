"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { PurchaseFilters, usePurchases } from "@/hooks/usePurchases";
import { PaymentStatus, PurchaseStatus, PurchaseWithRelations } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../table/DataTable";
import { purchasesColumns } from "../table/columns/purchasesColumns";
import { PurchaseDialog } from "./PurchaseDialog";

interface Props {
  initialData: { documents: PurchaseWithRelations[]; total: number };
}
const PurchasesTable = ({ initialData }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PurchaseWithRelations>(
    {} as PurchaseWithRelations
  );

  const {
    purchases,
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
  } = usePurchases({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = (rowData: PurchaseWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
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
    (newFilters: PurchaseFilters) => {
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

  const purchaseFilters = {
    totalAmount: {
      type: "number" as const,
      label: "Grand Total",
    },
    purchaseDate: {
      type: "date" as const,
      label: "Purchase Date",
    },
    status: {
      type: "select" as const,
      label: "Purchase Status",
      options: Object.values(PurchaseStatus).map((item) => ({
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

  return (
    <>
      <DataTable
        columns={purchasesColumns}
        data={purchases || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={purchaseFilters}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <PurchaseDialog
        mode={"view"}
        open={openDialog && !!selectedRow}
        onOpenChange={closeDialog}
        purchase={selectedRow}
      />
    </>
  );
};

export default PurchasesTable;
