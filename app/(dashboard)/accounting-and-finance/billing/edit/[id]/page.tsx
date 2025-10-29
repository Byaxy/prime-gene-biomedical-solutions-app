import BillPaymentFormWrapper from "@/components/bills/BillPaymentFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const EditBill = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  return (
    <PageWraper title="Edit Bill">
      <Suspense fallback={<FormSkeleton />}>
        <BillPaymentFormWrapper mode="edit" billPaymentId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditBill;
