import ExpenseCategoryFormWrapper from "@/components/expenseCategories/ExpenseCategoryFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const EditExpenseCategory = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  return (
    <PageWraper title="Edit Expense Category">
      <Suspense fallback={<FormSkeleton />}>
        <ExpenseCategoryFormWrapper mode="edit" categoryId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditExpenseCategory;
