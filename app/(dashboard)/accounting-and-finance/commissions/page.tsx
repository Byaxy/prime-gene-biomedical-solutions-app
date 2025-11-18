import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { CommissionFilters } from "@/lib/validation";
import { CommissionStatus, CommissionPaymentStatus } from "@/types";

const CommissionListTableData = dynamic(
  () => import("@/components/commissions/CommissionListTableData"),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  salesAgentId?: string;
  saleId?: string;
  status?: string;
  paymentStatus?: string;
  commissionDate_start?: string;
  commissionDate_end?: string;
  amount_min?: string;
  amount_max?: string;
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: CommissionFilters = {
    search: sp.search || undefined,
    salesAgentId: sp.salesAgentId || undefined,
    saleId: sp.saleId || undefined,
    status: (sp.status as CommissionStatus) || undefined,
    paymentStatus: (sp.paymentStatus as CommissionPaymentStatus) || undefined,
    commissionDate_start: sp.commissionDate_start || undefined,
    commissionDate_end: sp.commissionDate_end || undefined,
    amount_min: sp.amount_min ? Number(sp.amount_min) : undefined,
    amount_max: sp.amount_max ? Number(sp.amount_max) : undefined,
  };

  return (
    <PageWraper
      title="Sales Commissions"
      buttonText="Create Commission"
      buttonPath="/accounting-and-finance/commissions/create"
    >
      <Suspense fallback={<TableSkeleton />}>
        <CommissionListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
