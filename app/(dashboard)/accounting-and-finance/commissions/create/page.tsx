import CommissionFormWrapper from "@/components/commissions/CommissionFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreateCommission = () => {
  return (
    <PageWraper title="Create Sales Commission">
      <Suspense fallback={<FormSkeleton />}>
        <CommissionFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateCommission;
