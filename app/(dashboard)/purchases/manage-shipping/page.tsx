import PageWraper from "@/components/PageWraper";
import ShipmentFormWrapper from "@/components/shipments/ShipmentFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const ManageShippingPage = () => {
  return (
    <PageWraper title="Create New Shipment">
      <Suspense fallback={<FormSkeleton />}>
        <ShipmentFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default ManageShippingPage;
