import PageWraper from "@/components/PageWraper";
import PurchaseFormWrapper from "@/components/purchases/PurchaseFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreatePurchase = () => {
  return (
    <PageWraper title="Create Purchase">
      <Suspense fallback={<FormSkeleton />}>
        <PurchaseFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreatePurchase;
