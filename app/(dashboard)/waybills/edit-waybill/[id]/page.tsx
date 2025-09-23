import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import WaybillFormWrapper from "@/components/waybills/WaybillFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";

export interface Params {
  id: string;
}

const EditWaybill = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Waybill">
      <Suspense fallback={<FormSkeleton />}>
        <WaybillFormWrapper mode="edit" waybillId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditWaybill;
