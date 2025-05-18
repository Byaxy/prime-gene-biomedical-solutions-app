"use client";

import PageWraper from "@/components/PageWraper";
import { useParams } from "next/navigation";

const CreatePromissoryNoteFromSale = () => {
  const { id } = useParams();

  return (
    <PageWraper title="Create Promissory Note">
      <section className="space-y-6">
        <div className="bg-blue-50 px-5 py-4 rounded-md">
          <p className="text-blue-800 font-medium">Creating for Sale: {id}</p>
        </div>
      </section>
    </PageWraper>
  );
};

export default CreatePromissoryNoteFromSale;
