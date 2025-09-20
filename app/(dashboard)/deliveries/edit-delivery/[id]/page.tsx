import DeliveryFormWrapper from "@/components/deliveries/DeliveryFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}
const EditDelivery = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  return (
    <PageWraper title="Edit Delivery Note">
      <Suspense fallback={<FormSkeleton />}>
        <DeliveryFormWrapper mode="edit" deliveryId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditDelivery;
