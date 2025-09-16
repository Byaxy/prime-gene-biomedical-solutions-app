"use client";

import { useDebounce } from "@/hooks/useDebounce";
import {
  PromissoryNoteFilters,
  usePromissoryNote,
} from "@/hooks/usePromissoryNote";
import { PromissoryNoteStatus, PromissoryNoteWithRelations } from "@/types";
import { useCallback, useEffect, useState } from "react";
import PromissoryNoteDialog from "./PromissoryNoteDialog";
import { promissoryNotesColumns } from "../table/columns/promissoryNotesColumns";
import { DataTable } from "../table/DataTable";

interface Props {
  initialData: { documents: PromissoryNoteWithRelations[]; total: number };
}

const PromissoryNotesTable = ({ initialData }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PromissoryNoteWithRelations>(
    {} as PromissoryNoteWithRelations
  );

  const {
    promissoryNotes,
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
  } = usePromissoryNote({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const promissoryNotesFilters = {
    promissoryNoteDate: {
      type: "date" as const,
      label: "Promissory Note Date",
    },
    status: {
      type: "select" as const,
      label: "Promissory Note Status",
      options: Object.values(PromissoryNoteStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
  };

  const handleRowClick = (rowData: PromissoryNoteWithRelations) => {
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
    (newFilters: PromissoryNoteFilters) => {
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
        columns={promissoryNotesColumns}
        data={promissoryNotes || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={promissoryNotesFilters}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <PromissoryNoteDialog
        mode={"view"}
        open={openDialog && !!selectedRow}
        onOpenChange={closeDialog}
        promissoryNote={selectedRow}
      />
    </>
  );
};

export default PromissoryNotesTable;
