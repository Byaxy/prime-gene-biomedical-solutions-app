import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import FormSkeleton from "@/components/ui/form-skeleton";
import PurchaseFormWrapper from "@/components/purchases/PurchaseFormWrapper";

export interface Params {
  id: string;
}

const EditPurchase = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Purchase">
      <Suspense fallback={<FormSkeleton />}>
        <PurchaseFormWrapper mode={"edit"} purchaseId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditPurchase;
