/* eslint-disable @typescript-eslint/no-explicit-any */
import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { BackorderFilters } from "@/lib/actions/backorder.actions";

const BackorderListTableData = dynamic(
  () => import("@/components/backorders/BackorderListTableData"),
  { ssr: true, loading: () => <TableSkeleton /> }
);

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  productId?: string;
  saleId?: string;
  customerId?: string;
  pendingQuantity_min?: number;
  pendingQuantity_max?: number;
  createdAt_start?: string;
  createdAt_end?: string;
}

export default async function BackordersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: BackorderFilters = {
    search: sp.search || undefined,
    customerId: sp.customerId || undefined,
    productId: sp.productId || undefined,
    saleId: sp.saleId || undefined,
    pendingQuantity_min: sp.pendingQuantity_min
      ? Number(sp.pendingQuantity_min)
      : undefined,
    pendingQuantity_max: sp.pendingQuantity_max
      ? Number(sp.pendingQuantity_max)
      : undefined,
    createdAt_start: sp.createdAt_start || undefined,
    createdAt_end: sp.createdAt_end || undefined,
  };

  return (
    <PageWraper
      title="Back-orders"
      buttonText="Create Back-order"
      buttonPath="/inventory/backorders/create"
    >
      <Suspense fallback={<TableSkeleton />}>
        <BackorderListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
