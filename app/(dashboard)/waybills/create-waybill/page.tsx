import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import WaybillFormWrapper from "@/components/waybills/WaybillFormWrapper";
import { Suspense } from "react";

const CreateWaybill = () => {
  return (
    <PageWraper title="Create Waybill">
      <Suspense fallback={<FormSkeleton />}>
        <WaybillFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateWaybill;
