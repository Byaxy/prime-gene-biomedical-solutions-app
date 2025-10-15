import ExpenseFormWrapper from "@/components/expenses/ExpenseFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreateExpense = () => {
  return (
    <PageWraper title="Create Expense">
      <Suspense fallback={<FormSkeleton />}>
        <ExpenseFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateExpense;
