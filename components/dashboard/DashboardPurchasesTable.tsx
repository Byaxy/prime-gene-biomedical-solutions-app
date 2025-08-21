"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { DataTable } from "../table/DataTable";
import { dashboardPurchasesColumns } from "../table/columns/dashboardPurchasesColumns";
import { usePurchases } from "@/hooks/usePurchases";

const DashboardPurchasesTable = () => {
  const {
    purchases,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = usePurchases({ initialPageSize: 5 });

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-5 space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row justify-between items-start">
        <h2 className="text-xl font-semibold">Recent Purchases</h2>
        <Button
          variant="outline"
          className="text-blue-800 font-medium bg-transparent"
          asChild
        >
          <Link href="/purchases" prefetch={true}>
            View All
          </Link>
        </Button>
      </div>
      <DataTable
        columns={dashboardPurchasesColumns}
        data={purchases || []}
        isLoading={isLoading}
        hideSearch={true}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};

export default DashboardPurchasesTable;
