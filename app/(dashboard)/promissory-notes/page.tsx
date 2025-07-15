"use client";

import PageWraper from "@/components/PageWraper";
import PromissoryNoteDialog from "@/components/promissoryNotes/PromissoryNoteDialog";
import { promissoryNotesColumns } from "@/components/table/columns/promissoryNotesColumns";
import { DataTable } from "@/components/table/DataTable";
import { usePromissoryNote } from "@/hooks/usePromissoryNote";
import { PromissoryNoteStatus, PromissoryNoteWithRelations } from "@/types";
import { useState } from "react";

const PromissoryNotes = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPromissoryNote, setSelectedPromissoryNote] = useState(
    {} as PromissoryNoteWithRelations
  );
  const {
    promissoryNotes,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    onFilterChange,
    defaultFilterValues,
    refetch,
    isRefetching,
  } = usePromissoryNote({ initialPageSize: 10 });

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
    setSelectedPromissoryNote(rowData);
    setOpenDialog(true);
  };
  return (
    <PageWraper
      title="Promissory Notes"
      buttonText="Add Promissory Note"
      buttonPath="/promissory-notes/create-promissory-note"
    >
      <>
        <DataTable
          columns={promissoryNotesColumns}
          data={promissoryNotes || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchBy={[
            "promissoryNote.promissoryNoteRefNumber",
            "customer.name",
            "sale.invoiceNumber",
          ]}
          filters={promissoryNotesFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
          onRowClick={handleRowClick}
          refetch={refetch}
          isRefetching={isRefetching}
        />
        <PromissoryNoteDialog
          mode={"view"}
          open={openDialog && !!selectedPromissoryNote}
          onOpenChange={setOpenDialog}
          promissoryNote={selectedPromissoryNote}
        />
      </>
    </PageWraper>
  );
};

export default PromissoryNotes;
