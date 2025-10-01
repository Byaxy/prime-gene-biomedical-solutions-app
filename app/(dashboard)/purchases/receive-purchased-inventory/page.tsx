import PageWraper from "@/components/PageWraper";
import RecievingPurchaseFormWrapper from "@/components/receivingPurchases/RecievingPurchaseFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const ReceiveInventory = () => {
  return (
    <PageWraper title="Receive Purchased Inventory">
      <Suspense fallback={<FormSkeleton />}>
        <RecievingPurchaseFormWrapper mode={"create"} />
      </Suspense>
    </PageWraper>
  );
};

export default ReceiveInventory;
