import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import WaybillFormWrapper from "@/components/waybills/WaybillFormWrapper";
import { getSaleById } from "@/lib/actions/sale.actions";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const CreateWaybillFromSale = async ({
  params,
}: {
  params: Promise<Params>;
}) => {
  const { id } = await params;

  const sale = await getSaleById(id);

  return (
    <PageWraper title="Create Waybill">
      <section className="space-y-6">
        <div className="bg-blue-50 px-5 py-4 rounded-md">
          <p className="text-blue-800 font-medium">
            Creating for Sale: {sale.sale.invoiceNumber}
          </p>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <WaybillFormWrapper mode="create" sourceSaleId={id} />
        </Suspense>
      </section>
    </PageWraper>
  );
};

export default CreateWaybillFromSale;
