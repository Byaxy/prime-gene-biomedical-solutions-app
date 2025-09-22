import PageWraper from "@/components/PageWraper";
import PromissoryNoteFormWrapper from "@/components/promissoryNotes/PromissoryNoteFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreatePromissoryNote = () => {
  return (
    <PageWraper title="Create Promissory Note">
      <Suspense fallback={<FormSkeleton />}>
        <PromissoryNoteFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreatePromissoryNote;
