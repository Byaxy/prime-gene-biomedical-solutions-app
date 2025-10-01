import PageWraper from "@/components/PageWraper";
import PurchaseOrderFormWrapper from "@/components/purchaseOrders/PurchaseOrderFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreatePurchase = () => {
  return (
    <PageWraper title="Create Purchase Order">
      <Suspense fallback={<FormSkeleton />}>
        <PurchaseOrderFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreatePurchase;
