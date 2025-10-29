import RecordIncomeFormWrapper from "@/components/income/RecordIncomeFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import React, { Suspense } from "react";

export interface Params {
  id: string;
}

const EditPayment = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  return (
    <PageWraper title="Edit Income Payment">
      <Suspense fallback={<FormSkeleton />}>
        <RecordIncomeFormWrapper mode="edit" incomeId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditPayment;
