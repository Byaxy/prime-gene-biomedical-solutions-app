import RecordIncomeFormWrapper from "@/components/income/RecordIncomeFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import React, { Suspense } from "react";

export interface SearchParams {
  sourceSaleId?: string;
}

const RecordIncome = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const { sourceSaleId } = await searchParams;

  return (
    <PageWraper title="Record Income">
      <Suspense fallback={<FormSkeleton />}>
        <RecordIncomeFormWrapper mode="create" sourceSaleId={sourceSaleId} />
      </Suspense>
    </PageWraper>
  );
};

export default RecordIncome;
