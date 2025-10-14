import IncomeCategoryFormWrapper from "@/components/incomeCategories/IncomeCategoryFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import React, { Suspense } from "react";

const CreateIncomeCategory = () => {
  return (
    <PageWraper title="Create Income Category">
      <Suspense fallback={<FormSkeleton />}>
        <IncomeCategoryFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateIncomeCategory;
