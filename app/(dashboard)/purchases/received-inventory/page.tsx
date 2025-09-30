import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ReceivedPurchaseFilters } from "@/hooks/useReceivingPurchases";
import { getReceivedPurchases } from "@/lib/actions/receivingPurchases.actions";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const ReceivedPurchasesTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: ReceivedPurchaseFilters;
}) => {
  const initialData = await getReceivedPurchases(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const ReceivedPurchasesTable = dynamic(
    () => import("@/components/receivingPurchases/ReceivedPurchasesTable")
  );
  return <ReceivedPurchasesTable initialData={initialData} />;
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  receivingDate_start?: string;
  receivingDate_end?: string;
}

const ReceivedInventory = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: ReceivedPurchaseFilters = {
    search: sp.search || undefined,
    totalAmount_min: sp.totalAmount_min
      ? Number(sp.totalAmount_min)
      : undefined,
    totalAmount_max: sp.totalAmount_max
      ? Number(sp.totalAmount_max)
      : undefined,
    receivingDate_start: sp.receivingDate_start || undefined,
    receivingDate_end: sp.receivingDate_end || undefined,
  };
  return (
    <PageWraper
      title="Received Inventory"
      buttonText="Receive Purchased Inventory."
      buttonPath="/purchases/receive-purchased-inventory"
    >
      <Suspense fallback={<TableSkeleton />}>
        <ReceivedPurchasesTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default ReceivedInventory;
