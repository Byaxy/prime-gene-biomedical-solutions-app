import ExpenseFormWrapper from "@/components/expenses/ExpenseFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}
const EditExpense = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Expense">
      <Suspense fallback={<FormSkeleton />}>
        <ExpenseFormWrapper expenseId={id} mode="edit" />
      </Suspense>
    </PageWraper>
  );
};

export default EditExpense;
