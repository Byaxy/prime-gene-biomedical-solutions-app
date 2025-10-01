import PageWraper from "@/components/PageWraper";
import ShipmentFormWrapper from "@/components/shipments/ShipmentFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const EditShipment = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Sipment">
      <Suspense fallback={<FormSkeleton />}>
        <ShipmentFormWrapper mode="edit" shipmentId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditShipment;
