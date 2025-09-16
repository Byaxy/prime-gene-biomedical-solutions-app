import PageWraper from "@/components/PageWraper";
import { PromissoryNoteFilters } from "@/hooks/usePromissoryNote";
import { getPromissoryNotes } from "@/lib/actions/promissoryNote.actions";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Loading from "../loading";

const PromissoryNotesTable = dynamic(
  () => import("@/components/promissoryNotes/PromissoryNotesTable")
);

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

  const initialData = await getPromissoryNotes(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );

  return (
    <PageWraper
      title="Promissory Notes"
      buttonText="Add Promissory Note"
      buttonPath="/promissory-notes/create-promissory-note"
    >
      <Suspense fallback={<Loading />}>
        <PromissoryNotesTable initialData={initialData} />
      </Suspense>
    </PageWraper>
  );
};

export default PromissoryNotes;
