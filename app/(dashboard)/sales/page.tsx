import { SaleFilters } from "@/hooks/useSales";
import PageWraper from "@/components/PageWraper";
import SalesOverview from "@/components/sales/SalesOverview";
import dynamic from "next/dynamic";
import { getSales } from "@/lib/actions/sale.actions";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const SalesTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: SaleFilters;
}) => {
  const initialData = await getSales(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const SalesTable = dynamic(() => import("@/components/sales/SalesTable"), {
    ssr: true,
  });
  return <SalesTable initialData={initialData} />;
};

const SalesOverviewDataLoader = async () => {
  const allSales = await getSales(0, 0, true);
  return <SalesOverview sales={allSales.documents || []} />;
};

const SalesOverviewSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse bg-gray-100 rounded-lg">
            <CardContent className="p-6">
              <div className="h-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse bg-gray-100 rounded-lg">
          <CardContent>
            <div className="h-36 lg:h-48" />
          </CardContent>
        </Card>
        <Card className="animate-pulse bg-gray-100 rounded-lg">
          <CardContent>
            <div className="h-36 lg:h-48" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  amountPaid_min?: number;
  amountPaid_max?: number;
  saleDate_start?: string;
  saleDate_end?: string;
  status?: string;
  paymentStatus?: string;
}

const Sales = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: SaleFilters = {
    search: sp.search || undefined,
    totalAmount_min: sp.totalAmount_min
      ? Number(sp.totalAmount_min)
      : undefined,
    totalAmount_max: sp.totalAmount_max
      ? Number(sp.totalAmount_max)
      : undefined,
    amountPaid_min: sp.amountPaid_min ? Number(sp.amountPaid_min) : undefined,
    amountPaid_max: sp.amountPaid_max ? Number(sp.amountPaid_max) : undefined,
    saleDate_start: sp.saleDate_start || undefined,
    saleDate_end: sp.saleDate_end || undefined,
    status: sp.status || undefined,
    paymentStatus: sp.paymentStatus || undefined,
  };

  return (
    <PageWraper
      title="Sales"
      buttonText="Create Invoice"
      buttonPath="/sales/create-invoice"
    >
      <>
        <Suspense fallback={<SalesOverviewSkeleton />}>
          <SalesOverviewDataLoader />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <SalesTableData
            currentPage={currentPage}
            currentPageSize={currentPageSize}
            filters={filtersForServer}
          />
        </Suspense>
      </>
    </PageWraper>
  );
};

export default Sales;
