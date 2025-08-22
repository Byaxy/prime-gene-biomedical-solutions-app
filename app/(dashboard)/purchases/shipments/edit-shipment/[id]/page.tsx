import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import EditShipmentPage from "@/components/shipments/EditShipmentPage";
import { Suspense, use } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

const EditShipment = ({ params }: Props) => {
  const { id } = use(params);

  return (
    <PageWraper title="Edit Sipment">
      <Suspense fallback={<Loading />}>
        <EditShipmentPage shipmentId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditShipment;
