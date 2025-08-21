"use client";

import { useSales } from "@/hooks/useSales";
import SalesBarChart, { getSalesChartData } from "./SalesBarChart";
import { getRangeOption, RANGE_OPTIONS } from "@/lib/rangeOptions";

const DashboardSalesChart = ({
  searchParams,
}: {
  searchParams: {
    salesRange?: string;
    salesRangeFrom: string;
    salesRangeTo: string;
  };
}) => {
  const { salesRange, salesRangeFrom, salesRangeTo } = searchParams;
  const { sales, isLoading } = useSales({ getAllSales: true });

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
    <SalesBarChart
      chartData={chartData}
      queryKey="salesRange"
      isLoading={isLoading}
      selectedRange={totalSalesRangeOptions.label}
    />
  );
};

export default DashboardSalesChart;
