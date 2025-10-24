import RecordIncomeFormWrapper from "@/components/income/RecordIncomeFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import React, { Suspense } from "react";

const RecordIncome = () => {
  return (
    <PageWraper title="Create Expense">
      <Suspense fallback={<FormSkeleton />}>
        <RecordIncomeFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default RecordIncome;
