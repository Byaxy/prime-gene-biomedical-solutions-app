import PayCommissionFormWrapper from "@/components/commissions/PayCommissionFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const PayCommission = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Pay Sales Commission">
      <Suspense fallback={<FormSkeleton />}>
        <PayCommissionFormWrapper commissionId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default PayCommission;
