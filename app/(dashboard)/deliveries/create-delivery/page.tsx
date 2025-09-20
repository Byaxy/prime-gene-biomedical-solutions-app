import DeliveryFormWrapper from "@/components/deliveries/DeliveryFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreateDelivery = () => {
  return (
    <PageWraper title="Create Delivery Note">
      <Suspense fallback={<FormSkeleton />}>
        <DeliveryFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateDelivery;
