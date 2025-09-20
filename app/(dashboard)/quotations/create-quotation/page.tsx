import PageWraper from "@/components/PageWraper";
import QuotationFormWrapper from "@/components/quotations/QuotationFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreateQuotation = () => {
  return (
    <PageWraper title="Create Quotation">
      <section className="space-y-6">
        <Suspense fallback={<FormSkeleton />}>
          <QuotationFormWrapper mode="create" />
        </Suspense>
      </section>
    </PageWraper>
  );
};

export default CreateQuotation;
