import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import SaleFormWrapper from "@/components/sales/SaleFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";

const CreateInvoice = async () => {
  return (
    <PageWraper title="Create Invoice">
      <Suspense fallback={<FormSkeleton />}>
        <SaleFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateInvoice;
