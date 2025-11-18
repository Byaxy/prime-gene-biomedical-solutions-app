import CommissionFormWrapper from "@/components/commissions/CommissionFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}
const EditCommission = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Sales Commission">
      <Suspense fallback={<FormSkeleton />}>
        <CommissionFormWrapper commissionId={id} mode="edit" />
      </Suspense>
    </PageWraper>
  );
};

export default EditCommission;
