import IncomeCategoryFormWrapper from "@/components/incomeCategories/IncomeCategoryFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const EditIncomeCategory = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  return (
    <PageWraper title="Edit Income Category">
      <Suspense fallback={<FormSkeleton />}>
        <IncomeCategoryFormWrapper mode="edit" categoryId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditIncomeCategory;
