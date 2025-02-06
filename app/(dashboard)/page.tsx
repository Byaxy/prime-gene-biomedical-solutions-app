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
      <div className="w-full flex flex-col gap-12 mt-6">
        <Overview />
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 w-full">
          <SalesBarChart
            chartData={chartData}
            queryKey="salesRange"
            isLoading={isLoading}
            selectedRange={totalSalesRangeOptions.label}
          />
          <div>Users</div>
        </div>
      </div>
    </Suspense>
  );
}
