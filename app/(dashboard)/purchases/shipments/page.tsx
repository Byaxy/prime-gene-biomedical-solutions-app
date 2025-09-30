import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import { ShipmentFilters } from "@/hooks/useShipments";
import { getShipments } from "@/lib/actions/shipment.actions";
import dynamic from "next/dynamic";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const ShipmentsTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: ShipmentFilters;
}) => {
  const initialData = await getShipments(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );

  const ShipmentsTable = dynamic(
    () => import("@/components/shipments/ShipmentsTable"),
    {
      ssr: true,
    }
  );
  return <ShipmentsTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  shippingDate_start?: string;
  shippingDate_end?: string;
  shippingMode?: string;
  status?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  carrierType?: string;
  shipperType?: string;
}

const Shipments = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: ShipmentFilters = {
    search: sp.search || undefined,
    totalAmount_min: sp.totalAmount_min
      ? Number(sp.totalAmount_min)
      : undefined,
    totalAmount_max: sp.totalAmount_max
      ? Number(sp.totalAmount_max)
      : undefined,
    shippingDate_start: sp.shippingDate_start || undefined,
    shippingDate_end: sp.shippingDate_end || undefined,
    status: sp.status || undefined,
    shippingMode: sp.shippingMode || undefined,
    carrierType: sp.carrierType || undefined,
    shipperType: sp.shipperType || undefined,
  };

  return (
    <PageWraper
      title="Shipments"
      buttonText="Add Shipment"
      buttonPath="/purchases/manage-shipping"
    >
      <Suspense fallback={<TableSkeleton />}>
        <ShipmentsTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Shipments;
