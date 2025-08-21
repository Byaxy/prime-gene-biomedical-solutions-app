"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { DataTable } from "../table/DataTable";
import { useSales } from "@/hooks/useSales";
import { dashboardSalesColumns } from "../table/columns/dashboardSalesColumns";

const DashboardSalesTable = () => {
  const { sales, isLoading, totalItems, page, setPage, pageSize, setPageSize } =
    useSales({ initialPageSize: 5 });

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-5 space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row justify-between items-start">
        <h2 className="text-xl font-semibold">Recent Sales</h2>
        <Button
          variant="outline"
          className="text-blue-800 font-medium bg-transparent"
          asChild
        >
          <Link href="/sales" prefetch={true}>
            View All
          </Link>
        </Button>
      </div>
      <DataTable
        columns={dashboardSalesColumns}
        data={sales || []}
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

export default DashboardSalesTable;
