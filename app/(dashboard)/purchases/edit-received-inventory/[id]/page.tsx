import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import FormSkeleton from "@/components/ui/form-skeleton";
import RecievingPurchaseFormWrapper from "@/components/receivingPurchases/RecievingPurchaseFormWrapper";

export interface Params {
  id: string;
}

const EditReceivedInventory = async ({
  params,
}: {
  params: Promise<Params>;
}) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Received Inventory">
      <Suspense fallback={<FormSkeleton />}>
        <RecievingPurchaseFormWrapper mode={"edit"} receivedPurchaseId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditReceivedInventory;
