import PromissoryNoteForm from "@/components/forms/PromissoryNoteForm";
import PageWraper from "@/components/PageWraper";

const CreatePromissoryNote = () => {
  return (
    <PageWraper title="Create Promissory Note">
      <section className="space-y-6">
        <PromissoryNoteForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default CreatePromissoryNote;
