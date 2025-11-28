"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import {
  CommissionWithRelations,
  CommissionStatus,
  CommissionPaymentStatus,
  SaleWithRelations,
  SalesAgentWithRelations,
} from "@/types";
import { useCommissions } from "@/hooks/useCommissions";
import { useSalesAgents } from "@/hooks/useSalesAgents";
import { useSales } from "@/hooks/useSales";
import { commissionColumns } from "@/components/table/columns/commissionColumns";
import CommissionDialog from "./CommissionDialog";
import { CommissionFilters } from "@/lib/validation";

interface CommissionListTableProps {
  initialData: { documents: CommissionWithRelations[]; total: number };
}

const CommissionListTable: React.FC<CommissionListTableProps> = ({
  initialData,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CommissionWithRelations>(
    {} as CommissionWithRelations
  );

  const {
    commissions,
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
    refetchCommissions: refetch,
  } = useCommissions({ initialData });

  const { salesAgents: allSalesAgents } = useSalesAgents({
    getAllSalesAgents: true,
  });
  const { sales: allSales } = useSales({ getAllSales: true });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch ?? "");
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = useCallback((rowData: CommissionWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  }, []);

  const commissionsFiltersConfig = useMemo(
    () => ({
      salesAgentId: {
        type: "select" as const,
        label: "Sales Agent",
        options: allSalesAgents.map((agent: SalesAgentWithRelations) => ({
          label: agent.salesAgent.name,
          value: agent.salesAgent.id,
        })),
      },
      saleId: {
        type: "select" as const,
        label: "Related Sale",
        options: allSales.map((sale: SaleWithRelations) => ({
          label: sale.sale.invoiceNumber,
          value: sale.sale.id,
        })),
      },
      status: {
        type: "select" as const,
        label: "Status",
        options: Object.values(CommissionStatus).map((s) => ({
          label: s
            .split("_")
            .join(" ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          value: s,
        })),
      },
      paymentStatus: {
        type: "select" as const,
        label: "Payment Status",
        options: Object.values(CommissionPaymentStatus).map((s) => ({
          label: s
            .split("_")
            .join(" ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          value: s,
        })),
      },
      commissionDate: {
        type: "date" as const,
        label: "Commission Date",
      },
      amount: {
        type: "number" as const,
        label: "Net Payable",
      },
    }),
    [allSalesAgents, allSales]
  );

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
    (newFilters: CommissionFilters) => {
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
        columns={commissionColumns}
        data={commissions || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={commissionsFiltersConfig}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      {openDialog && (
        <CommissionDialog
          mode={"view"}
          open={openDialog && !!selectedRow.commission?.id}
          onOpenChange={closeDialog}
          commission={selectedRow}
        />
      )}
    </>
  );
};

export default CommissionListTable;
