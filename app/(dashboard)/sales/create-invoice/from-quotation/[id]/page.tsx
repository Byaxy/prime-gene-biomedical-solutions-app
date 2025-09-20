import PageWraper from "@/components/PageWraper";
import { getQuotationById } from "@/lib/actions/quotation.actions";
import { Suspense } from "react";
import SaleFormWrapper from "@/components/sales/SaleFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";

export interface Params {
  id: string;
}

const CreateInvoiceFromQuotation = async ({
  params,
}: {
  params: Promise<Params>;
}) => {
  const { id } = await params;

  const sourceQuotation = await getQuotationById(id);

  return (
    <PageWraper title="Create Invoice">
      <section className="space-y-6">
        <div className="bg-blue-50 px-5 py-4 rounded-md">
          <p className="text-blue-800 font-medium">
            Converting Quotation: {sourceQuotation?.quotation.quotationNumber}
          </p>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <SaleFormWrapper mode="create" sourceQuotationId={id} />
        </Suspense>
      </section>
    </PageWraper>
  );
};

export default CreateInvoiceFromQuotation;
