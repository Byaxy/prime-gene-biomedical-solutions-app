import PageWraper from "@/components/PageWraper";
import { getPurchaseOrderById } from "@/lib/actions/purchaseOrder.actions";
import { Suspense } from "react";
import PurchaseFormWrapper from "@/components/purchases/PurchaseFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";

export interface Params {
  id: string;
}

const CreatePurchaseFromPurchaseOrder = async ({
  params,
}: {
  params: Promise<Params>;
}) => {
  const { id } = await params;

  const purchaseOrder = await getPurchaseOrderById(id);

  return (
    <PageWraper title="Create Purchase">
      <section className="space-y-6">
        <div className="bg-blue-50 px-5 py-4 rounded-md">
          <p className="text-blue-800 font-medium">
            Converting Purchase Order:{" "}
            {purchaseOrder?.purchaseOrder.purchaseOrderNumber}
          </p>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <PurchaseFormWrapper mode="create" sourcePurchaseOrderId={id} />
        </Suspense>
      </section>
    </PageWraper>
  );
};

export default CreatePurchaseFromPurchaseOrder;
