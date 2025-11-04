import PageWraper from "@/components/PageWraper";
import ReceiptFormWrapper from "@/components/receipts/ReceiptFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface SearchParams {
  sourcePaymentReceivedId?: string;
}
const GenerateReceipt = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const { sourcePaymentReceivedId } = await searchParams;

  return (
    <PageWraper title="Generate Receipt">
      <Suspense fallback={<FormSkeleton />}>
        <ReceiptFormWrapper
          mode="create"
          sourcePaymentReceivedId={sourcePaymentReceivedId}
        />
      </Suspense>
    </PageWraper>
  );
};

export default GenerateReceipt;
