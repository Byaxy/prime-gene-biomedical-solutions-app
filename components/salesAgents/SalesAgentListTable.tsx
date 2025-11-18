/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import { SalesAgentWithRelations } from "@/types";
import { useSalesAgents } from "@/hooks/useSalesAgents";
import { salesAgentsColumns } from "@/components/table/columns/salesAgentsColumns";
import SalesAgentDialog from "./SalesAgentDialog";

interface SalesAgentListTableProps {
  initialData: { documents: SalesAgentWithRelations[]; total: number };
}

const SalesAgentListTable: React.FC<SalesAgentListTableProps> = ({
  initialData,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SalesAgentWithRelations>(
    {} as SalesAgentWithRelations
  );

  const {
    salesAgents,
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
  } = useSalesAgents({ initialData });

  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = useCallback((rowData: SalesAgentWithRelations) => {
    setSelectedRow(rowData);
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
        columns={salesAgentsColumns}
        data={salesAgents || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
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
        <SalesAgentDialog
          mode={"view"}
          open={openDialog && !!selectedRow.salesAgent?.id}
          onOpenChange={closeDialog}
          salesAgent={selectedRow}
        />
      )}
    </>
  );
};

export default SalesAgentListTable;
