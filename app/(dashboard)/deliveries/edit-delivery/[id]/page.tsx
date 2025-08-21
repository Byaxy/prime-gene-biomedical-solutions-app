import Loading from "@/app/(dashboard)/loading";
import EditDeliveryPage from "@/components/deliveries/EditDeliveryPage";
import PageWraper from "@/components/PageWraper";
import { Suspense, use } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

const EditDelivery = ({ params }: Props) => {
  const { id } = use(params);
  return (
    <PageWraper title="Edit Delivery Note">
      <Suspense fallback={<Loading />}>
        <EditDeliveryPage deliveryId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditDelivery;
