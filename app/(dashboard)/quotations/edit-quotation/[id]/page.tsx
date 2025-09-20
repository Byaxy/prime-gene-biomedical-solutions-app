import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import FormSkeleton from "@/components/ui/form-skeleton";
import QuotationFormWrapper from "@/components/quotations/QuotationFormWrapper";

export interface Params {
  id: string;
}

const EditQuotation = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Quotation">
      <section className="space-y-6">
        <Suspense fallback={<FormSkeleton />}>
          <QuotationFormWrapper mode="edit" quotationId={id} />
        </Suspense>
      </section>
    </PageWraper>
  );
};

export default EditQuotation;
