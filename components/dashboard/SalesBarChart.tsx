"use client";

import { useCompanySettings } from "@/hooks/useCompanySettings";
import { formatCurrency } from "@/lib/utils";
import { Sale } from "@/types/appwrite.types";
import {
  startOfDay,
  parseISO,
  eachDayOfInterval,
  subDays,
  differenceInDays,
  interval,
  differenceInWeeks,
  eachWeekOfInterval,
  max,
  min,
  startOfWeek,
  endOfWeek,
  differenceInMonths,
  eachMonthOfInterval,
  eachYearOfInterval,
} from "date-fns";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Loading from "../loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { RANGE_OPTIONS } from "@/lib/rangeOptions";
import { useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import { Calendar } from "../ui/calendar";

interface ChartDataPoint {
  date: string;
  totalAmount: number;
  amountPaid: number;
  pendingAmount: number;
}

// Format large numbers to K/M format
const formatYAxis = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
};

export function getSalesChartData(
  sales: Sale[] | null,
  createdAfter: Date | null = null,
  createdBefore: Date | null = new Date()
): ChartDataPoint[] {
  if (!sales || sales.length === 0) return [];

  // Get date range
  const startDate =
    createdAfter ||
    startOfDay(parseISO(sales[sales.length - 1].saleDate.toString()));
  const endDate = createdBefore || new Date();

  // Get array of all dates in range
  const { array, format } = getChartDateArray(startDate, endDate);

  // Initialize data structure with all dates
  const dayArray = array.map((date) => ({
    date: format(date),
    totalAmount: 0,
    amountPaid: 0,
    pendingAmount: 0,
  }));

  // Process sales data
  sales.forEach((sale) => {
    const saleDate = parseISO(sale.saleDate.toString());
    const formattedDate = format(saleDate);

    const entry = dayArray.find((day) => day.date === formattedDate);
    if (entry) {
      entry.totalAmount += sale.totalAmount;
      entry.amountPaid += sale.amountPaid;
      entry.pendingAmount += sale.totalAmount - sale.amountPaid;
    }
  });

  return dayArray;
}

const SalesBarChart = ({
  queryKey,
  chartData,
  isLoading,
  selectedRange,
}: {
  queryKey: string;
  chartData: ChartDataPoint[];
  isLoading: boolean;
  selectedRange: string;
}) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const { companySettings } = useCompanySettings();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currencySymbol = companySettings
    ? companySettings[0]?.currencySymbol
    : "$";

  const salesTotalAmount = chartData
    ? chartData.reduce(
        (sum: number, value: ChartDataPoint) => (sum += value.totalAmount),
        0
      )
    : 0;

  const formattedTotal = formatCurrency(
    String(salesTotalAmount),
    currencySymbol
  );

  const setRange = (range: keyof typeof RANGE_OPTIONS | DateRange) => {
    const params = new URLSearchParams(searchParams);
    if (typeof range === "string") {
      params.set(queryKey, range);
      params.delete(`${queryKey}From`);
      params.delete(`${queryKey}To`);
    } else {
      if (range.from == null || range.to == null) return;
      params.delete(queryKey);
      params.set(`${queryKey}From`, range.from.toISOString());
      params.set(`${queryKey}To`, range.to.toISOString());
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full lg:col-span-3 bg-white p-5 rounded-lg shadow-sm flex flex-col gap-6">
      {isLoading ? (
        <div className="w-full flex items-center justify-center h-80">
          <Loading />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 md:flex-row justify-between items-start pb-4">
            <div className="flex flex-col gap-2">
              <p className="text-lg text-dark-600">Total Revenue</p>
              <h2 className="text-xl font-semibold">{formattedTotal}</h2>
            </div>
            <div className="flex flex-row items-center justify-end gap-4">
              <div className="flex flex-row gap-1 items-center">
                <div className="bg-blue-800 h-4 w-4 rounded-full" />
                <span className="text-sm text-blue-800">Paid</span>
              </div>
              <div className="flex flex-row gap-1 items-center">
                <div className="bg-[#72d9d6] h-4 w-4 rounded-full" />
                <span className="text-sm text-blue-800">Pending</span>
              </div>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-blue-800 font-medium"
                    >
                      {selectedRange}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white">
                    {Object.entries(RANGE_OPTIONS).map(([key, value]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() =>
                          setRange(key as keyof typeof RANGE_OPTIONS)
                        }
                        className="cursor-pointer text-blue-800 font-medium hover:bg-blue-800 hover:text-white rounded-md"
                      >
                        {value.label}
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer m-1 text-blue-800 font-medium hover:bg-blue-800 hover:text-white rounded-md">
                        Custom
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-white z-30">
                        <Calendar
                          mode="range"
                          disabled={{ after: new Date() }}
                          selected={dateRange}
                          defaultMonth={dateRange?.from}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                          classNames={{
                            day_selected: "bg-blue-800 text-white",
                            day_range_middle: "bg-[#EDF3F6] !text-blue-800/50",
                            day: "m-1 px-2 py-1 rounded",
                            caption:
                              "text-2xl font-semibold text-blue-800 text-center",
                            nav_button:
                              "bg-blue-800 text-white p-1 rounded mx-1",
                          }}
                        />
                        <DropdownMenuItem className="hover:bg-auto">
                          <Button
                            onClick={() => {
                              if (dateRange == null) return;
                              setRange(dateRange);
                              console.log(dateRange);
                            }}
                            disabled={dateRange == null}
                            className="w-full shad-primary-btn"
                          >
                            Submit
                          </Button>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" minHeight={300}>
            <BarChart data={chartData}>
              <CartesianGrid stroke="#EDF3F6" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={formatYAxis} />
              <Tooltip
                cursor={{ fill: "#EDF3F6" }}
                formatter={(value) =>
                  formatCurrency(String(value), currencySymbol)
                }
                wrapperClassName="rounded-md shadow-sm border-dark-700"
              />
              <Bar dataKey="amountPaid" fill="#002060" name="Paid" />
              <Bar dataKey="pendingAmount" fill="#72d9d6" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

export default SalesBarChart;

function getChartDateArray(startDate: Date, endDate: Date = new Date()) {
  const days = differenceInDays(endDate, startDate);
  if (days < 30) {
    return {
      array: eachDayOfInterval(interval(startDate, endDate)),
      format: formatDate,
    };
  }

  const weeks = differenceInWeeks(endDate, startDate);
  if (weeks < 30) {
    return {
      array: eachWeekOfInterval(interval(startDate, endDate)),
      format: (date: Date) => {
        const start = max([startOfWeek(date), startDate]);
        const end = min([endOfWeek(date), endDate]);

        return `${formatDate(start)} - ${formatDate(end)}` as string;
      },
    };
  }

  const months = differenceInMonths(endDate, startDate);
  if (months < 30) {
    return {
      array: eachMonthOfInterval(interval(startDate, endDate)),
      format: new Intl.DateTimeFormat("en", { month: "short", year: "numeric" })
        .format,
    };
  }

  return {
    array: eachYearOfInterval(interval(startDate, endDate)),
    format: new Intl.DateTimeFormat("en", { year: "numeric" }).format,
  };
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(date);
}
