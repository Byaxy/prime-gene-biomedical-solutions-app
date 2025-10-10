import ExpenseCategoryFormWrapper from "@/components/expenseCategories/ExpenseCategoryFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import React, { Suspense } from "react";

const CreateExpenseCategory = () => {
  return (
    <PageWraper title="Create Expense Category">
      <Suspense fallback={<FormSkeleton />}>
        <ExpenseCategoryFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateExpenseCategory;
