import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import PromissoryNoteFormWrapper from "@/components/promissoryNotes/PromissoryNoteFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";

export interface Params {
  id: string;
}

const EditPromissoryNote = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  return (
    <PageWraper title="Edit Promissory Note Note">
      <Suspense fallback={<FormSkeleton />}>
        <PromissoryNoteFormWrapper mode="edit" promissoryNoteId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditPromissoryNote;
