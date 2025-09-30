import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { PurchaseOrderFilters } from "@/hooks/usePurchaseOrders";
import { getPurchaseOrders } from "@/lib/actions/purchaseOrder.actions";
import dynamic from "next/dynamic";
import React, { Suspense } from "react";

const PurchaseOrdersTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: PurchaseOrderFilters;
}) => {
  const initialData = await getPurchaseOrders(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const PurchaseOrdersTable = dynamic(
    () => import("@/components/purchaseOrders/PurchaseOrdersTable")
  );
  return <PurchaseOrdersTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  purchaseOrderDate_start?: string;
  purchaseOrderDate_end?: string;
  status?: string;
  isConvertedToPurchase?: boolean;
}

const PurchaseOrders = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: PurchaseOrderFilters = {
    search: sp.search || undefined,
    totalAmount_min: sp.totalAmount_min
      ? Number(sp.totalAmount_min)
      : undefined,
    totalAmount_max: sp.totalAmount_max
      ? Number(sp.totalAmount_max)
      : undefined,
    purchaseOrderDate_start: sp.purchaseOrderDate_start || undefined,
    purchaseOrderDate_end: sp.purchaseOrderDate_end || undefined,
    status: sp.status || undefined,
    isConvertedToPurchase: sp.isConvertedToPurchase || undefined,
  };

  return (
    <PageWraper
      title="Purchase Orders"
      buttonText="Add Purchase Order"
      buttonPath="/purchases/create-purchase-order"
    >
      <Suspense fallback={<TableSkeleton />}>
        <PurchaseOrdersTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default PurchaseOrders;
