import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { CommissionPayoutFilters } from "@/lib/validation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const CommissionPaymentsListTableData = dynamic(
  () => import("@/components/commissions/CommissionPaymentsListTableData"),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

interface SearchParams {
  payoutPage?: string;
  payoutPageSize?: string;
  payoutSearch?: string;
  payoutRefNumber?: string;
  payoutCommissionId?: string;
  payoutRecipientId?: string;
  payoutSalesAgentId?: string;
  payoutPayingAccountId?: string;
  payoutExpenseCategoryId?: string;
  payoutDate_start?: string;
  payoutDate_end?: string;
  payoutAmount_min?: string;
  payoutAmount_max?: string;
}

const CommissionPaymnets = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const sp = await searchParams;
  const currentPage = Number(sp.payoutPage || 0);
  const currentPageSize =
    sp.payoutPageSize === "0" ? 0 : Number(sp.payoutPageSize || 10);

  // Construct filters for payouts
  const filtersForServer: CommissionPayoutFilters = {
    search: sp.payoutSearch || undefined,
    payoutRefNumber: sp.payoutRefNumber || undefined,
    commissionId: sp.payoutCommissionId || undefined,
    commissionRecipientId: sp.payoutRecipientId || undefined,
    salesAgentId: sp.payoutSalesAgentId || undefined,
    payingAccountId: sp.payoutPayingAccountId || undefined,
    expenseCategoryId: sp.payoutExpenseCategoryId || undefined,
    payoutDate_start: sp.payoutDate_start || undefined,
    payoutDate_end: sp.payoutDate_end || undefined,
    amount_min: sp.payoutAmount_min ? Number(sp.payoutAmount_min) : undefined,
    amount_max: sp.payoutAmount_max ? Number(sp.payoutAmount_max) : undefined,
  };

  return (
    <PageWraper title="Sales Commissions Payments">
      <Suspense fallback={<TableSkeleton />}>
        <CommissionPaymentsListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
};

export default CommissionPaymnets;
