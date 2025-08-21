"use client";

import PromissoryNoteForm from "@/components/forms/PromissoryNoteForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { getPromissoryNoteById } from "@/lib/actions/promissoryNote.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditPromissoryNote = () => {
  const { id } = useParams();

  const { data: promissoryNote, isLoading } = useQuery({
    queryKey: ["promissoryNotes"],
    queryFn: async () => {
      if (!id) return null;
      return await getPromissoryNoteById(id as string);
    },
    enabled: !!id,
    staleTime: 0,
  });

  if (isLoading) {
    return <Loading />;
  }
  return (
    <PageWraper title="Edit Promissory Note Note">
      <section className="space-y-6">
        <PromissoryNoteForm
          mode={"edit"}
          initialData={promissoryNote ? promissoryNote : undefined}
        />
      </section>
    </PageWraper>
  );
};

export default EditPromissoryNote;
