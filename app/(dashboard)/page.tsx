import { Suspense } from "react";
import Overview from "@/components/dashboard/Overview";
import DashboardSalesChart from "@/components/dashboard/DashboardSalesChart";
import DashboardSalesTable from "@/components/dashboard/DashboardSalesTable";
import DashboardPurchasesTable from "@/components/dashboard/DashboardPurchasesTable";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default async function Home(props: {
  searchParams: Promise<{
    salesRange?: string;
    salesRangeFrom: string;
    salesRangeTo: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <Overview />

      <div className="grid grid-cols-1 w-full">
        <Suspense fallback={<ChartSkeleton />}>
          <DashboardSalesChart searchParams={searchParams} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        <Suspense fallback={<TableSkeleton />}>
          <DashboardSalesTable />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <DashboardPurchasesTable />
        </Suspense>
      </div>
    </div>
  );
}
