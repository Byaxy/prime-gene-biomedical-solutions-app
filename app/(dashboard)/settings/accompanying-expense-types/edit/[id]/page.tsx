import AccompanyingExpenseTypeFormWrapper from "@/components/accompanyingExpenses/AccompanyingExpenseTypeFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}
const EditAccopmanyingExpenseType = async ({
  params,
}: {
  params: Promise<Params>;
}) => {
  const { id } = await params;
  return (
    <PageWraper title="Edit Accompanying Expense Type">
      <Suspense fallback={<FormSkeleton />}>
        <AccompanyingExpenseTypeFormWrapper mode="edit" typeId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditAccopmanyingExpenseType;
