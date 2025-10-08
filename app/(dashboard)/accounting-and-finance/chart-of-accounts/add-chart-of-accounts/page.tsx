import ChartOfAccountsFormWrapper from "@/components/chartOfAccounts/ChartOfAccountFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import React, { Suspense } from "react";

const AddChartOfAccounts = () => {
  return (
    <PageWraper title="Add Chart Of Accounts">
      <Suspense fallback={<FormSkeleton />}>
        <ChartOfAccountsFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default AddChartOfAccounts;
