"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { QuotationFilters, useQuotations } from "@/hooks/useQuotations";
import { QuotationStatus, QuotationWithRelations } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../table/DataTable";
import QuotationDialog from "./QuotationsDialog";
import { quotationsColumns } from "../table/columns/quotationsColumns";

interface Props {
  initialData: { documents: QuotationWithRelations[]; total: number };
}

const QuotationsTable = ({ initialData }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<QuotationWithRelations>(
    {} as QuotationWithRelations
  );

  const {
    quotations,
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
  } = useQuotations({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = (rowData: QuotationWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  };

  const quotationFilters = {
    totalAmount: {
      type: "number" as const,
      label: "Grand Total",
    },
    quotationDate: {
      type: "date" as const,
      label: "Quotation Date",
    },
    status: {
      type: "select" as const,
      label: "Quotation Status",
      options: Object.values(QuotationStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
    convertedToSale: {
      type: "select" as const,
      label: "Converted to Sale?",
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
    (newFilters: QuotationFilters) => {
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
        columns={quotationsColumns}
        data={quotations || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={quotationFilters}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <QuotationDialog
        mode={"view"}
        open={openDialog && !!selectedRow}
        onOpenChange={closeDialog}
        quotation={selectedRow}
      />
    </>
  );
};

export default QuotationsTable;
