import AccompanyingExpenseTypeFormWrapper from "@/components/accompanyingExpenses/AccompanyingExpenseTypeFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreateAccompanyingExpenseType = () => {
  return (
    <PageWraper title="Create Accompanying Expense Type">
      <Suspense fallback={<FormSkeleton />}>
        <AccompanyingExpenseTypeFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateAccompanyingExpenseType;
