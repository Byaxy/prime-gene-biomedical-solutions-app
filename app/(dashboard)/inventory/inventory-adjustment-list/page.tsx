import PageWraper from "@/components/PageWraper";
import dynamic from "next/dynamic";
import { InventoryTransactionsFilters } from "@/hooks/useInventoryStockTransactions";
import { getInventoryTransactions } from "@/lib/actions/inventoryStock.actions";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const InventoryTransactionsTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: InventoryTransactionsFilters;
}) => {
  const initialData = await getInventoryTransactions(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const InventoryTransactionsTable = dynamic(
    () => import("@/components/inventory/InventoryTransactionsTable"),
    {
      ssr: true,
    }
  );
  return <InventoryTransactionsTable initialData={initialData} />;
};

export interface InventoryTransactionsSearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  productId?: string;
  storeId?: string;
  transactionType?: string;
  transactionDate_start?: string;
  transactionDate_end?: string;
}

const InventoryAdjustmentList = async ({
  searchParams,
}: {
  searchParams: Promise<InventoryTransactionsSearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: InventoryTransactionsFilters = {
    search: sp.search || undefined,
    productId: sp.productId || undefined,
    storeId: sp.storeId || undefined,
    transactionType: sp.transactionType || undefined,
    transactionDate_start: sp.transactionDate_start || undefined,
    transactionDate_end: sp.transactionDate_end || undefined,
  };

  return (
    <PageWraper title="Inventory Stock Logs">
      <Suspense fallback={<TableSkeleton />}>
        <InventoryTransactionsTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default InventoryAdjustmentList;
