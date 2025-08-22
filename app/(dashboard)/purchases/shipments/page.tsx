import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import Loading from "../../loading";
import ShipmentsTable from "@/components/shipments/ShipmentsTable";

const Shipments = () => {
  return (
    <PageWraper
      title="Shipments"
      buttonText="Add Shipment"
      buttonPath="/purchases/manage-shipping"
    >
      <Suspense fallback={<Loading />}>
        <ShipmentsTable />
      </Suspense>
    </PageWraper>
  );
};

export default Shipments;
