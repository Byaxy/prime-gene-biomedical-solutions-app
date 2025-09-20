import PageWraper from "@/components/PageWraper";
import dynamic from "next/dynamic";
import { InventoryTransactionsFilters } from "@/hooks/useInventoryStockTransactions";
import { getInventoryTransactions } from "@/lib/actions/inventoryStock.actions";

const InventoryTransactionsTable = dynamic(
  () => import("@/components/inventory/InventoryTransactionsTable")
);

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

  const initialData = await getInventoryTransactions(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );
  return (
    <PageWraper title="Inventory Stock Logs">
      <InventoryTransactionsTable initialData={initialData} />
    </PageWraper>
  );
};

export default InventoryAdjustmentList;
