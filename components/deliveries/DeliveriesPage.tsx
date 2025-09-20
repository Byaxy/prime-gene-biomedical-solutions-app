import { DeliveryFilters } from "@/hooks/useDeliveries";
import { getDeliveries } from "@/lib/actions/delivery.actions";

import dynamic from "next/dynamic";
const DeliveriesTable = dynamic(
  () => import("@/components/deliveries/DeliveriesTable")
);

interface PageProps {
  currentPage: number;
  currentPageSize: number;
  filters: DeliveryFilters;
}
const DeliveriesPage = async ({
  currentPage,
  currentPageSize,
  filters,
}: PageProps) => {
  const initialData = await getDeliveries(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  return <DeliveriesTable initialData={initialData} />;
};

export default DeliveriesPage;
