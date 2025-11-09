import PageWraper from "@/components/PageWraper";
import { PromissoryNoteFilters } from "@/hooks/usePromissoryNote";
import { getPromissoryNotes } from "@/lib/actions/promissoryNote.actions";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const PromissoryNotesTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: PromissoryNoteFilters;
}) => {
  const initialData = await getPromissoryNotes(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const PromissoryNotesTable = dynamic(
    () => import("@/components/promissoryNotes/PromissoryNotesTable")
  );
  return <PromissoryNotesTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  promissoryNoteDate_start?: string;
  promissoryNoteDate_end?: string;
  status?: string;
}

const PromissoryNotes = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: PromissoryNoteFilters = {
    search: sp.search || undefined,
    promissoryNoteDate_start: sp.promissoryNoteDate_start || undefined,
    promissoryNoteDate_end: sp.promissoryNoteDate_end || undefined,
    status: sp.status || undefined,
  };

  return (
    <PageWraper
      title="Promissory Notes"
      buttonText="Add Promissory Note"
      buttonPath="/promissory-notes/create-promissory-note"
    >
      <Suspense fallback={<TableSkeleton />}>
        <PromissoryNotesTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default PromissoryNotes;
