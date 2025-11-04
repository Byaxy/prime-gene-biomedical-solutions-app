import PageWraper from "@/components/PageWraper";
import { InventoryStockFilters } from "@/hooks/useInventoryStock";
import { getInventoryStock } from "@/lib/actions/inventoryStock.actions";
import dynamic from "next/dynamic";
import InventoryStats from "@/components/inventory/InventoryStats";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const InventoryStockTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: InventoryStockFilters;
}) => {
  const initialData = await getInventoryStock(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const InventoryStockTable = dynamic(
    () => import("@/components/inventory/InventoryStockTable")
  );
  return <InventoryStockTable initialData={initialData} />;
};

const OverviewSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse bg-gray-100 rounded-lg">
            <CardContent className="p-6">
              <div className="h-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export interface InventoryStockSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  costPrice_min?: string;
  costPrice_max?: string;
  sellingPrice_min?: string;
  sellingPrice_max?: string;
  quantity_min?: string;
  quantity_max?: string;
  expiryDate_start?: string;
  expiryDate_end?: string;
  manufactureDate_start?: string;
  manufactureDate_end?: string;
  store?: string;
}

const InventoryStocks = async ({
  searchParams,
}: {
  searchParams: Promise<InventoryStockSearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: InventoryStockFilters = {
    search: sp.search || undefined,
    costPrice_min: sp.costPrice_min ? Number(sp.costPrice_min) : undefined,
    costPrice_max: sp.costPrice_max ? Number(sp.costPrice_max) : undefined,
    sellingPrice_min: sp.sellingPrice_min
      ? Number(sp.sellingPrice_min)
      : undefined,
    sellingPrice_max: sp.sellingPrice_max
      ? Number(sp.sellingPrice_max)
      : undefined,
    quantity_min: sp.quantity_min ? Number(sp.quantity_min) : undefined,
    quantity_max: sp.quantity_max ? Number(sp.quantity_max) : undefined,
    expiryDate_start: sp.expiryDate_start || undefined,
    expiryDate_end: sp.expiryDate_end || undefined,
    manufactureDate_start: sp.manufactureDate_start || undefined,
    manufactureDate_end: sp.manufactureDate_end || undefined,
    store: sp.store || undefined,
  };

  return (
    <PageWraper
      title="Inventory Stock List"
      buttonText="Add New/Adjust"
      buttonPath="/inventory/adjust-inventory"
    >
      <div className="flex flex-col gap-5">
        <Suspense fallback={<OverviewSkeleton />}>
          <InventoryStats />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <InventoryStockTableData
            currentPage={currentPage}
            currentPageSize={currentPageSize}
            filters={filtersForServer}
          />
        </Suspense>
      </div>
    </PageWraper>
  );
};

export default InventoryStocks;
