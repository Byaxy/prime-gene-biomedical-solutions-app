import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import Loading from "../loading";
import DeliveriesTable from "@/components/deliveries/DeliveriesTable";

const Deliveries = () => {
  return (
    <PageWraper
      title="Deliveries"
      buttonText="Add Delivery"
      buttonPath="/deliveries/create-delivery"
    >
      <Suspense fallback={<Loading />}>
        <DeliveriesTable />
      </Suspense>
    </PageWraper>
  );
};

export default Deliveries;
