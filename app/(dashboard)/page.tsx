"use client";

import { Suspense } from "react";
import "@/app/dynamic-routes";
import Loading from "../../components/loading";
import Overview from "@/components/dashboard/Overview";
import SalesBarChart, {
  getSalesChartData,
} from "@/components/dashboard/SalesBarChart";
import { useSales } from "@/hooks/useSales";
import { getRangeOption, RANGE_OPTIONS } from "@/lib/rangeOptions";
import { useUsers } from "@/hooks/useUsers";
import { DataTable } from "@/components/table/DataTable";
import { dashboardUsersColumns } from "@/components/table/columns/dashboardUsersColumns";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { dashboardSalesColumns } from "@/components/table/columns/dashboardSalesColumns";
import { dashboardPurchasesColumns } from "@/components/table/columns/dashboardPurchasesColumns";
import { usePurchases } from "@/hooks/usePurchases";

export const dynamic = "force-dynamic";

export default function Home({
  searchParams: { salesRange, salesRangeFrom, salesRangeTo },
}: {
  searchParams: {
    salesRange?: string;
    salesRangeFrom: string;
    salesRangeTo: string;
  };
}) {
  const { sales, isLoading } = useSales();
  const { users, isLoading: usersLoading } = useUsers();
  const { purchases, isLoading: purchasesLoading } = usePurchases();

  const router = useRouter();

  const totalSalesRangeOptions =
    getRangeOption(salesRange, salesRangeFrom, salesRangeTo) ||
    RANGE_OPTIONS.last_7_days;

  const chartData =
    sales &&
    getSalesChartData(
      sales,
      totalSalesRangeOptions.startDate,
      totalSalesRangeOptions.endDate
    );

  return (
    <Suspense fallback={<Loading />}>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="w-full flex flex-col gap-6 py-5">
        <Overview />
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 w-full">
          <SalesBarChart
            chartData={chartData}
            queryKey="salesRange"
            isLoading={isLoading}
            selectedRange={totalSalesRangeOptions.label}
          />
          <div className="w-full xl:col-span-2 bg-white rounded-lg shadow-sm p-5 space-y-6">
            <div className="flex flex-col gap-5 sm:flex-row justify-between items-start">
              <h2 className="text-xl font-semibold">Users</h2>
              <Button
                variant="outline"
                className="text-blue-800 font-medium"
                onClick={() => router.push("/users")}
              >
                View All
              </Button>
            </div>
            <DataTable
              columns={dashboardUsersColumns}
              data={users || []}
              isLoading={usersLoading}
              hideSearch={true}
              pageSize={5}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <div className="w-full bg-white rounded-lg shadow-sm p-5 space-y-6">
            <div className="flex flex-col gap-5 sm:flex-row justify-between items-start">
              <h2 className="text-xl font-semibold">Recent Sales</h2>
              <Button
                variant="outline"
                className="text-blue-800 font-medium"
                onClick={() => router.push("/sales")}
              >
                View All
              </Button>
            </div>
            <DataTable
              columns={dashboardSalesColumns}
              data={sales || []}
              isLoading={isLoading}
              hideSearch={true}
              pageSize={5}
            />
          </div>
          <div className="w-full bg-white rounded-lg shadow-sm p-5 space-y-6">
            <div className="flex flex-col gap-5 sm:flex-row justify-between items-start">
              <h2 className="text-xl font-semibold">Recent Purchases</h2>
              <Button
                variant="outline"
                className="text-blue-800 font-medium"
                onClick={() => router.push("/purchases")}
              >
                View All
              </Button>
            </div>
            <DataTable
              columns={dashboardPurchasesColumns}
              data={purchases || []}
              isLoading={purchasesLoading}
              hideSearch={true}
              pageSize={5}
            />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
