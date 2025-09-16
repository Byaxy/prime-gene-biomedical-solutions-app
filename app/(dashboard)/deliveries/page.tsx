import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import Loading from "../loading";
import { DeliveryFilters } from "@/hooks/useDeliveries";
import { getDeliveries } from "@/lib/actions/delivery.actions";
import dynamic from "next/dynamic";

const DeliveriesTable = dynamic(
  () => import("@/components/deliveries/DeliveriesTable")
);

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  deliveryDate_start?: string;
  deliveryDate_end?: string;
  status?: string;
}

const Deliveries = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: DeliveryFilters = {
    search: sp.search || undefined,
    deliveryDate_start: sp.deliveryDate_start || undefined,
    deliveryDate_end: sp.deliveryDate_end || undefined,
    status: sp.status || undefined,
  };

  const initialData = await getDeliveries(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );

  return (
    <PageWraper
      title="Deliveries"
      buttonText="Add Delivery"
      buttonPath="/deliveries/create-delivery"
    >
      <Suspense fallback={<Loading />}>
        <DeliveriesTable initialData={initialData} />
      </Suspense>
    </PageWraper>
  );
};

export default Deliveries;
