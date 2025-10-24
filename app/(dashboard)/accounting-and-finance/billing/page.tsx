/* eslint-disable @typescript-eslint/no-explicit-any */
import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { BillTrackerFilters } from "@/lib/validation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const BillTrackerListTableData = dynamic(
  () => import("@/components/bills/BillTrackerListTableData"),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  vendorId?: string;
  type?: string;
  status?: string;
  dateRange?: string;
  specificDate_start?: string;
  specificDate_end?: string;
}

export default async function BillTrackerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: BillTrackerFilters = {
    search: sp.search || undefined,
    vendorId: sp.vendorId || undefined,
    type: (sp.type as any) || undefined,
    status: (sp.status as any) || undefined,
    dateRange: (sp.dateRange as any) || undefined,
    specificDate_start: sp.specificDate_start || undefined,
    specificDate_end: sp.specificDate_end || undefined,
  };

  return (
    <PageWraper
      title="Bill Tracker"
      buttonText="Pay Bill"
      buttonPath="/accounting-and-finance/billing/pay-bill"
    >
      <Suspense fallback={<TableSkeleton />}>
        <BillTrackerListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
