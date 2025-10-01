import PageWraper from "@/components/PageWraper";
import React, { Suspense } from "react";
import PurchaseOrderFormWrapper from "@/components/purchaseOrders/PurchaseOrderFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";

export interface Params {
  id: string;
}

const EditPurchaseOrder = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Purchase Order">
      <Suspense fallback={<FormSkeleton />}>
        <PurchaseOrderFormWrapper mode={"edit"} purchaseOrderId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditPurchaseOrder;
