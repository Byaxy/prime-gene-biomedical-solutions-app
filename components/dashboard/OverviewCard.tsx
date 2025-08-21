"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Loading from "../../app/(dashboard)/loading";

interface OverviewCardProps {
  title: string;
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  total: number;
  isLoading: boolean;
  isNumber?: boolean;
}

const OverviewCard = ({
  title,
  data,
  total,
  isLoading,
  isNumber,
}: OverviewCardProps) => {
  const { companySettings } = useCompanySettings();

  const currencySymbol = companySettings
    ? companySettings?.currencySymbol
    : "$";

  const formattedTotal = formatCurrency(String(total), currencySymbol);

  return (
    <Card className="w-full bg-white shadow-lg">
      {isLoading ? (
        <div className="w-full flex items-center justify-center h-32">
          <Loading />
        </div>
      ) : (
        <div className="flex flex-row items-center justify-between gap-5 px-5">
          <CardHeader className="space-y-1 p-0">
            <span className="text-nowrap text-lg text-dark-600 font-semibold">
              {title}
            </span>
            <CardTitle className="text-xl font-bold">
              {isNumber ? total : formattedTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full max-w-32 h-32 p-0 -mr-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="90%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    isNumber
                      ? formatNumber(String(value))
                      : formatCurrency(String(value), currencySymbol)
                  }
                  wrapperClassName="rounded-md shadow-sm border-dark-700"
                  filterNull={true}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </div>
      )}
    </Card>
  );
};

export default OverviewCard;
