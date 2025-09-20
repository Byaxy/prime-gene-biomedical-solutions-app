import DeliveryFormWrapper from "@/components/deliveries/DeliveryFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const CreateDeliveryFromSale = async ({
  params,
}: {
  params: Promise<Params>;
}) => {
  const { id } = await params;
  return (
    <PageWraper title="Create Delivery">
      <Suspense fallback={<FormSkeleton />}>
        <DeliveryFormWrapper mode="create" sourceSaleId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default CreateDeliveryFromSale;
