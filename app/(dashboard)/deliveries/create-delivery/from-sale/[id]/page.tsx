import Loading from "@/app/(dashboard)/loading";
import CreateDeliveryFromSalePage from "@/components/deliveries/CreateDeliveryFromSalePage";
import PageWraper from "@/components/PageWraper";
import { Suspense, use } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

const CreateDeliveryFromSale = ({ params }: Props) => {
  const { id } = use(params);
  return (
    <PageWraper title="Create Delivery">
      <Suspense fallback={<Loading />}>
        <CreateDeliveryFromSalePage saleId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default CreateDeliveryFromSale;
