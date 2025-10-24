import BillPaymentFormWrapper from "@/components/bills/BillPaymentFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const PayBill = () => {
  return (
    <PageWraper title="Pay Bill">
      <Suspense fallback={<FormSkeleton />}>
        <BillPaymentFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default PayBill;
