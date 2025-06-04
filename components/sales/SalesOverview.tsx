"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Users,
  AlertCircle,
} from "lucide-react";
import { SaleWithRelations, PaymentStatus, SaleStatus } from "@/types";
import FormatNumber from "../FormatNumber";
import { formatNumber } from "@/lib/utils";

interface SalesOverviewProps {
  sales: SaleWithRelations[];
  isLoading?: boolean;
}

const SalesOverview = ({ sales, isLoading }: SalesOverviewProps) => {
  const statistics = useMemo(() => {
    if (!sales?.length) {
      return {
        totalRevenue: 0,
        totalSales: 0,
        totalPaid: 0,
        outstandingBalance: 0,
        uniqueCustomers: 0,
        averageOrderValue: 0,
        completedSales: 0,
        pendingSales: 0,
        cancelledSales: 0,
        paidSales: 0,
        partialPaidSales: 0,
        unpaidSales: 0,
        dueSales: 0,
      };
    }

    const totalRevenue = sales.reduce(
      (sum, sale) => sum + sale.sale.totalAmount,
      0
    );
    const totalPaid = sales.reduce(
      (sum, sale) => sum + sale.sale.amountPaid,
      0
    );
    const outstandingBalance = totalRevenue - totalPaid;
    const uniqueCustomers = new Set(
      sales.map((sale) => sale.customer?.id).filter(Boolean)
    ).size;
    const averageOrderValue = totalRevenue / sales.length;

    const statusCounts = sales.reduce((acc, sale) => {
      acc[sale.sale.status] = (acc[sale.sale.status] || 0) + 1;
      return acc;
    }, {} as Record<SaleStatus, number>);

    const paymentStatusCounts = sales.reduce((acc, sale) => {
      acc[sale.sale.paymentStatus] = (acc[sale.sale.paymentStatus] || 0) + 1;
      return acc;
    }, {} as Record<PaymentStatus, number>);

    return {
      totalRevenue,
      totalSales: sales.length,
      totalPaid,
      outstandingBalance,
      uniqueCustomers,
      averageOrderValue,
      completedSales: statusCounts.completed || 0,
      pendingSales: statusCounts.pending || 0,
      cancelledSales: statusCounts.cancelled || 0,
      paidSales: paymentStatusCounts.paid || 0,
      partialPaidSales: paymentStatusCounts.partial || 0,
      unpaidSales: paymentStatusCounts.pending || 0,
      dueSales: paymentStatusCounts.due || 0,
    };
  }, [sales]);

  const statusData = [
    { name: "Completed", value: statistics.completedSales, color: "#10b981" },
    { name: "Pending", value: statistics.pendingSales, color: "#f59e0b" },
    { name: "Cancelled", value: statistics.cancelledSales, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  const paymentStatusData = [
    { name: "Paid", value: statistics.paidSales, color: "#10b981" },
    { name: "Partial", value: statistics.partialPaidSales, color: "#2563eb" },
    { name: "Pending", value: statistics.unpaidSales, color: "#f59e0b" },
    { name: "Due", value: statistics.dueSales, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = "text-blue-600",
    bgColor = "bg-blue-50",
    isLoading = false,
    isCurrency,
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color?: string;
    bgColor?: string;
    isLoading?: boolean;
    isCurrency?: boolean;
  }) => (
    <Card className="hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-blue-800">
              {isLoading ? (
                "..."
              ) : isCurrency ? (
                <FormatNumber value={value} />
              ) : (
                formatNumber(String(value))
              )}
            </p>
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-8 w-8 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-gray-100 rounded-lg">
              <CardContent className="p-6">
                <div className="h-12"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 my-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Revenue"
          value={statistics.totalRevenue}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-50"
          isCurrency
        />
        <StatCard
          title="Total Sales"
          value={statistics.totalSales}
          icon={ShoppingCart}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Amount Paid"
          value={statistics.totalPaid}
          icon={CreditCard}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          isCurrency
        />
        <StatCard
          title="Outstanding Balance"
          value={statistics.outstandingBalance}
          icon={AlertCircle}
          color="text-red-600"
          bgColor="bg-red-50"
          isCurrency
        />
        <StatCard
          title="Unique Customers"
          value={statistics.uniqueCustomers}
          icon={Users}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          title="Avg Order Value"
          value={statistics.averageOrderValue}
          icon={TrendingUp}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
          isCurrency
        />
      </div>

      {/* Status Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sale Status Distribution */}
        <Card className="hover:shadow-md transition-shadow bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Sale Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card className="hover:shadow-md transition-shadow bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Payment Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {paymentStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesOverview;
