import PageWraper from "@/components/PageWraper";
import ReceiptFormWrapper from "@/components/receipts/ReceiptFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const EditReceipt = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Receipt">
      <Suspense fallback={<FormSkeleton />}>
        <ReceiptFormWrapper receiptId={id} mode="edit" />
      </Suspense>
    </PageWraper>
  );
};

export default EditReceipt;
