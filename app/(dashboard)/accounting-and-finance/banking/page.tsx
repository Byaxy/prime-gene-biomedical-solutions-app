import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { AccountFilters } from "@/lib/validation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AccountListTableData = dynamic(
  () => import("@/components/accounts/AccountListTableData"),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  accountType?: string;
}

export default async function BankingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: AccountFilters = {
    search: sp.search || undefined,
    accountType: sp.accountType || undefined,
  };

  return (
    <PageWraper
      title="Financial Accounts"
      buttonText="Add Account"
      buttonPath="/accounting-and-finance/banking/create-account"
    >
      <Suspense fallback={<TableSkeleton />}>
        <AccountListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
