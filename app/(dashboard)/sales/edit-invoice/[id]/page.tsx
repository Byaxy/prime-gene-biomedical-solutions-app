import PageWraper from "@/components/PageWraper";
import SaleFormWrapper from "@/components/sales/SaleFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const EditInvoice = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title={`Edit Invoice`}>
      <section className="space-y-6">
        <Suspense fallback={<FormSkeleton />}>
          <SaleFormWrapper mode="edit" saleId={id} />
        </Suspense>
      </section>
    </PageWraper>
  );
};

export default EditInvoice;
