import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { IncomeFilters } from "@/lib/validation";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PaymentMethod } from "@/types";

// Dynamically import the client table data wrapper
const IncomeListTableData = dynamic(
  () => import("@/components/income/IncomeListTableData"),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  customerId?: string;
  saleId?: string;
  incomeCategoryId?: string;
  receivingAccountId?: string;
  paymentMethod?: string;
  paymentDate_start?: string;
  paymentDate_end?: string;
  amount_min?: string;
  amount_max?: string;
}

export default async function IncomeTrackerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: IncomeFilters = {
    search: sp.search || undefined,
    customerId: sp.customerId || undefined,
    saleId: sp.saleId || undefined,
    incomeCategoryId: sp.incomeCategoryId || undefined,
    receivingAccountId: sp.receivingAccountId || undefined,
    paymentMethod: (sp.paymentMethod as PaymentMethod) || undefined,
    paymentDate_start: sp.paymentDate_start || undefined,
    paymentDate_end: sp.paymentDate_end || undefined,
    amount_min: sp.amount_min ? Number(sp.amount_min) : undefined,
    amount_max: sp.amount_max ? Number(sp.amount_max) : undefined,
  };

  return (
    <PageWraper
      title="Income Transactions/Records"
      buttonText="Record Income"
      buttonPath="/accounting-and-finance/income/record-income"
    >
      <Suspense fallback={<TableSkeleton />}>
        <IncomeListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
