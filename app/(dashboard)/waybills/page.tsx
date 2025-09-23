import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { WaybillFilters } from "@/hooks/useWaybills";
import { getWaybills } from "@/lib/actions/waybill.actions";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const WaybillsTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: WaybillFilters;
}) => {
  const initialData = await getWaybills(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const WaybillsTable = dynamic(
    () => import("@/components/waybills/WaybillsTable")
  );
  return <WaybillsTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  waybillDate_start?: string;
  waybillDate_end?: string;
  status?: string;
  waybillType?: string;
  isConverted?: boolean;
  conversionStatus?: string;
}

const Waybills = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: WaybillFilters = {
    search: sp.search || undefined,
    waybillDate_start: sp.waybillDate_start || undefined,
    waybillDate_end: sp.waybillDate_end || undefined,
    status: sp.status || undefined,
    isConverted: sp.isConverted || undefined,
    waybillType: sp.waybillType || undefined,
    conversionStatus: sp.conversionStatus || undefined,
  };
  return (
    <PageWraper
      title="Way Bills"
      buttonText="Add Waybill"
      buttonPath="/waybills/create-waybill"
    >
      <Suspense fallback={<TableSkeleton />}>
        <WaybillsTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default Waybills;
