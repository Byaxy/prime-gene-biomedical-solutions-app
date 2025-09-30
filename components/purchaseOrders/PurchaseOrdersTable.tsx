"use client";

import { useDebounce } from "@/hooks/useDebounce";
import {
  PurchaseOrderFilters,
  usePurchaseOrders,
} from "@/hooks/usePurchaseOrders";
import { PurchaseOrderWithRelations, PurchaseStatus } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../table/DataTable";
import { purchaseOrderColumns } from "../table/columns/purchaseOrderColumns";
import PurchaseOrderDialog from "./PurchaseOrderDialog";

interface Props {
  initialData: { documents: PurchaseOrderWithRelations[]; total: number };
}

const PurchaseOrdersTable = ({ initialData }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PurchaseOrderWithRelations>(
    {} as PurchaseOrderWithRelations
  );

  const {
    purchaseOrders,
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
  } = usePurchaseOrders({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = (rowData: PurchaseOrderWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  };

  const purchaseOrderFilters = {
    totalAmount: {
      type: "number" as const,
      label: "Grand Total",
    },
    purchaseOrderDate: {
      type: "date" as const,
      label: "Purchase Order Date",
    },
    status: {
      type: "select" as const,
      label: "Purchase Order Status",
      options: Object.values(PurchaseStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
    isConvertedToPurchase: {
      type: "select" as const,
      label: "Converted to Purchase?",
      options: [
        { value: "true", label: "True" },
        { value: "false", label: "False" },
      ],
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
    (newFilters: PurchaseOrderFilters) => {
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
        columns={purchaseOrderColumns}
        data={purchaseOrders || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={purchaseOrderFilters}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <PurchaseOrderDialog
        mode={"view"}
        open={openDialog && !!selectedRow}
        onOpenChange={closeDialog}
        purchaseOrder={selectedRow}
      />
    </>
  );
};

export default PurchaseOrdersTable;
