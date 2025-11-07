/* eslint-disable @typescript-eslint/no-explicit-any */
import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ReceiptFilters } from "@/lib/validation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const ReceiptListTableData = dynamic(
  () => import("@/components/receipts/ReceiptListTableData"),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

// Define search parameters expected from the URL
export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  customerId?: string;
  receiptDate_start?: string;
  receiptDate_end?: string;
  amount_min?: string;
  amount_max?: string;
}

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  // Map URL search params to ReceiptFilters type
  const filtersForServer: ReceiptFilters = {
    search: sp.search || undefined,
    customerId: sp.customerId || undefined,
    receiptDate_start: sp.receiptDate_start || undefined,
    receiptDate_end: sp.receiptDate_end || undefined,
    amount_min: sp.amount_min ? Number(sp.amount_min) : undefined,
    amount_max: sp.amount_max ? Number(sp.amount_max) : undefined,
  };

  return (
    <PageWraper
      title="Receipts"
      buttonText="Generate Receipt"
      buttonPath="/accounting-and-finance/income/receipts/generate-receipt"
    >
      <Suspense fallback={<TableSkeleton />}>
        <ReceiptListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
