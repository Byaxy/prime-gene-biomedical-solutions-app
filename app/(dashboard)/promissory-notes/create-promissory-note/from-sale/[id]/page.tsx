import PageWraper from "@/components/PageWraper";
import PromissoryNoteFormWrapper from "@/components/promissoryNotes/PromissoryNoteFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { getSaleById } from "@/lib/actions/sale.actions";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const CreatePromissoryNoteFromSale = async ({
  params,
}: {
  params: Promise<Params>;
}) => {
  const { id } = await params;
  const sourceSale = await getSaleById(id);

  return (
    <PageWraper title="Create Promissory Note">
      <section className="space-y-6">
        <div className="bg-blue-50 px-5 py-4 rounded-md">
          <p className="text-blue-800 font-medium">
            For Sale: {sourceSale?.sale.invoiceNumber}
          </p>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <PromissoryNoteFormWrapper mode="create" saleId={id} />
        </Suspense>
      </section>
    </PageWraper>
  );
};

export default CreatePromissoryNoteFromSale;
