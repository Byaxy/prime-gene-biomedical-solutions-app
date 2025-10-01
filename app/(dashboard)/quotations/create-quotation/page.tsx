import PageWraper from "@/components/PageWraper";
import QuotationFormWrapper from "@/components/quotations/QuotationFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreateQuotation = () => {
  return (
    <PageWraper title="Create Quotation">
      <Suspense fallback={<FormSkeleton />}>
        <QuotationFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateQuotation;
