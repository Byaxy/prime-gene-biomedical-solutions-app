import { Suspense } from "react";
import Overview from "@/components/dashboard/Overview";
import DashboardSalesChart from "@/components/dashboard/DashboardSalesChart";
import DashboardUsersTable from "@/components/dashboard/DashboardUsersTable";
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

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 w-full">
        <Suspense fallback={<ChartSkeleton className="xl:col-span-3" />}>
          <DashboardSalesChart searchParams={searchParams} />
        </Suspense>

        <div className="xl:col-span-2">
          <Suspense fallback={<TableSkeleton />}>
            <DashboardUsersTable />
          </Suspense>
        </div>
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
