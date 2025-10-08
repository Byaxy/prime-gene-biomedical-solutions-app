import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getChartOfAccounts } from "@/lib/actions/accounting.actions";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const ChartOfAccountsData = async () => {
  const fetchedAccounts = await getChartOfAccounts();

  const ChartOfAccountsView = dynamic(
    () => import("@/components/chartOfAccounts/ChartOfAccountsView")
  );
  return <ChartOfAccountsView accounts={fetchedAccounts} />;
};

const ChartOfAccounts = async () => {
  return (
    <PageWraper
      title="Chart Of Accounts"
      buttonText="Add Chart Of Accounts"
      buttonPath="/accounting-and-finance/chart-of-accounts/add-chart-of-accounts"
    >
      <Suspense fallback={<TableSkeleton />}>
        <ChartOfAccountsData />
      </Suspense>
    </PageWraper>
  );
};

export default ChartOfAccounts;
