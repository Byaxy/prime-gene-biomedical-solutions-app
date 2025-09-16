import { SaleFilters } from "@/hooks/useSales";
import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import SalesOverview from "@/components/sales/SalesOverview";
import dynamic from "next/dynamic";
import Loading from "../loading";
import { getSales } from "@/lib/actions/sale.actions";

const SalesTable = dynamic(() => import("@/components/sales/SalesTable"));

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  totalAmount_min?: number;
  totalAmount_max?: number;
  amountPaid_min?: number;
  amountPaid_max?: number;
  saleDate_start?: string;
  saleDate_end?: string;
  status?: string;
  paymentStatus?: string;
}

const Sales = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: SaleFilters = {
    search: sp.search || undefined,
    totalAmount_min: sp.totalAmount_min
      ? Number(sp.totalAmount_min)
      : undefined,
    totalAmount_max: sp.totalAmount_max
      ? Number(sp.totalAmount_max)
      : undefined,
    amountPaid_min: sp.amountPaid_min ? Number(sp.amountPaid_min) : undefined,
    amountPaid_max: sp.amountPaid_max ? Number(sp.amountPaid_max) : undefined,
    saleDate_start: sp.saleDate_start || undefined,
    saleDate_end: sp.saleDate_end || undefined,
    status: sp.status || undefined,
    paymentStatus: sp.paymentStatus || undefined,
  };

  const initialData = await getSales(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filtersForServer
  );
  const allSales = await getSales(0, 0, true);
  const isLoadingAllSales = allSales.total === 0;

  return (
    <PageWraper
      title="Sales"
      buttonText="Create Invoice"
      buttonPath="/sales/create-invoice"
    >
      <Suspense fallback={<Loading />}>
        <SalesOverview
          sales={allSales.documents || []}
          isLoading={isLoadingAllSales}
        />
        <SalesTable initialData={initialData} />
      </Suspense>
    </PageWraper>
  );
};

export default Sales;
