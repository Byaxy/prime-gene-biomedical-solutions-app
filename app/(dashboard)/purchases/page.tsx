import PageWraper from "@/components/PageWraper";
import { PurchaseFilters } from "@/hooks/usePurchases";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import PurchasesOverview from "@/components/purchases/PurchasesOverview";
import dynamic from "next/dynamic";
import { getPurchases } from "@/lib/actions/purchase.actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const PPurchasesTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: {
  currentPage: number;
  currentPageSize: number;
  filters: PurchaseFilters;
}) => {
  const initialData = await getPurchases(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  const PurchasesTable = dynamic(
    () => import("@/components/purchases/PurchasesTable")
  );
  return <PurchasesTable initialData={initialData} />;
};

const OverviewDataLoader = async () => {
  const allPurchasesData = await getPurchases(0, 0, true);
  return <PurchasesOverview purchases={allPurchasesData.documents || []} />;
};

const OverviewSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse bg-gray-100 rounded-lg">
            <CardContent className="p-6">
              <div className="h-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse bg-gray-100 rounded-lg">
          <CardContent>
            <div className="h-36 lg:h-48" />
          </CardContent>
        </Card>
        <Card className="animate-pulse bg-gray-100 rounded-lg">
          <CardContent>
            <div className="h-36 lg:h-48" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  purchaseDate_start?: string;
  purchaseDate_end?: string;
  status?: string;
  paymentStatus?: string;
}

const Purchases = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: PurchaseFilters = {
    search: sp.search || undefined,
    totalAmount_min: sp.totalAmount_min
      ? Number(sp.totalAmount_min)
      : undefined,
    totalAmount_max: sp.totalAmount_max
      ? Number(sp.totalAmount_max)
      : undefined,
    purchaseDate_start: sp.purchaseDate_start || undefined,
    purchaseDate_end: sp.purchaseDate_end || undefined,
    status: sp.status || undefined,
    paymentStatus: sp.paymentStatus || undefined,
  };

  return (
    <PageWraper
      title="Purchases"
      buttonText="Add Purchase"
      buttonPath="/purchases/create-purchase"
    >
      <>
        <Suspense fallback={<OverviewSkeleton />}>
          <OverviewDataLoader />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <PPurchasesTableData
            currentPage={currentPage}
            currentPageSize={currentPageSize}
            filters={filtersForServer}
          />
        </Suspense>
      </>
    </PageWraper>
  );
};

export default Purchases;
