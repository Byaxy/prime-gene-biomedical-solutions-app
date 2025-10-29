import BillPaymentFormWrapper from "@/components/bills/BillPaymentFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface SearchParams {
  purchaseId?: string;
}

const PayBill = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const { purchaseId } = await searchParams;
  
  return (
    <PageWraper title="Pay Bill">
      <Suspense fallback={<FormSkeleton />}>
        <BillPaymentFormWrapper mode="create" purchaseId={purchaseId} />
      </Suspense>
    </PageWraper>
  );
};

export default PayBill;
