"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  DollarSign,
  ShoppingCart,
  CreditCard,
  Package,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";
import { PurchaseWithRelations, PurchaseStatus, ShippingStatus } from "@/types";
import StatCard from "../StatCard";

interface PurchasesOverviewProps {
  purchases: PurchaseWithRelations[];
  isLoading?: boolean;
}

const PurchasesOverview = ({
  purchases,
  isLoading,
}: PurchasesOverviewProps) => {
  const statistics = useMemo(() => {
    if (!purchases?.length) {
      return {
        totalPurchaseAmount: 0,
        totalPurchases: 0,
        totalAmountPaid: 0,
        outstandingBalance: 0,
        uniqueVendors: 0,
        averagePurchaseValue: 0,
        completedPurchases: 0,
        pendingPurchases: 0,
        cancelledPurchases: 0,
        totalPurchaseOrdersCreated: 0,
        totalPurchasesReceived: 0,
        totalPurchasesWaitingToBeReceived: 0,
      };
    }

    const totalPurchaseAmount = purchases.reduce(
      (sum, purchase) => sum + purchase.purchase.totalAmount,
      0
    );
    const totalAmountPaid = purchases.reduce(
      (sum, purchase) => sum + purchase.purchase.amountPaid,
      0
    );
    const outstandingBalance = totalPurchaseAmount - totalAmountPaid;
    const uniqueVendors = new Set(
      purchases.map((purchase) => purchase.vendor?.id).filter(Boolean)
    ).size;
    const averagePurchaseValue = totalPurchaseAmount / purchases.length;

    const statusCounts = purchases.reduce((acc, purchase) => {
      acc[purchase.purchase.status] = (acc[purchase.purchase.status] || 0) + 1;
      return acc;
    }, {} as Record<PurchaseStatus, number>);

    // Calculate shipping-based statistics
    const totalPurchasesReceived = purchases.filter(
      (purchase) => purchase.purchase.shippingStatus === ShippingStatus.Received
    ).length;

    const totalPurchasesWaitingToBeReceived = purchases.filter(
      (purchase) =>
        purchase.purchase.shippingStatus === ShippingStatus["Not Shipped"] ||
        purchase.purchase.shippingStatus === ShippingStatus.Shipped
    ).length;

    // Note: Purchase orders would typically come from a separate hook/data source
    // For now, we'll estimate based on purchase order IDs being present
    const totalPurchaseOrdersCreated = purchases.filter(
      (purchase) => purchase.purchase.purchaseOrderId
    ).length;

    return {
      totalPurchaseAmount,
      totalPurchases: purchases.length,
      totalAmountPaid,
      outstandingBalance,
      uniqueVendors,
      averagePurchaseValue,
      completedPurchases: statusCounts.completed || 0,
      pendingPurchases: statusCounts.pending || 0,
      cancelledPurchases: statusCounts.cancelled || 0,
      totalPurchaseOrdersCreated,
      totalPurchasesReceived,
      totalPurchasesWaitingToBeReceived,
    };
  }, [purchases]);

  const statusData = [
    {
      name: "Completed",
      value: statistics.completedPurchases,
      color: "#10b981",
    },
    { name: "Pending", value: statistics.pendingPurchases, color: "#f59e0b" },
    {
      name: "Cancelled",
      value: statistics.cancelledPurchases,
      color: "#ef4444",
    },
  ].filter((item) => item.value > 0);

  const shippingStatusData = [
    {
      name: "Received",
      value: statistics.totalPurchasesReceived,
      color: "#10b981",
    },
    {
      name: "Waiting to Receive",
      value: statistics.totalPurchasesWaitingToBeReceived,
      color: "#f59e0b",
    },
  ].filter((item) => item.value > 0);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Purchase Amount"
          value={statistics.totalPurchaseAmount}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-50"
          isCurrency
        />
        <StatCard
          title="Total Purchases"
          value={statistics.totalPurchases}
          icon={ShoppingCart}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Amount Paid"
          value={statistics.totalAmountPaid}
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
          title="Purchase Orders Created"
          value={statistics.totalPurchaseOrdersCreated}
          icon={FileText}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          title="Purchases Received"
          value={statistics.totalPurchasesReceived}
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          title="Waiting to be Received"
          value={statistics.totalPurchasesWaitingToBeReceived}
          icon={Clock}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard
          title="Unique Vendors"
          value={statistics.uniqueVendors}
          icon={Package}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />
      </div>

      {/* Status Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Status Distribution */}
        <Card className="hover:shadow-md transition-shadow bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Purchase Status Distribution
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

        {/* Shipping Status Distribution */}
        <Card className="hover:shadow-md transition-shadow bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Shipping Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shippingStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {shippingStatusData.map((entry, index) => (
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
              {shippingStatusData.map((item, index) => (
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

export default PurchasesOverview;
