import ChartOfAccountsFormWrapper from "@/components/chartOfAccounts/ChartOfAccountFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const EditChartOfAccounts = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title={`Edit Chart Of Accounts`}>
      <Suspense fallback={<FormSkeleton />}>
        <ChartOfAccountsFormWrapper mode="edit" chartOfAccountId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditChartOfAccounts;
