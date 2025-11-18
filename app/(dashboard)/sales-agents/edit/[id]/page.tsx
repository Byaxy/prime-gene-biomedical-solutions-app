import SalesAgentFormWrapper from "@/components/salesAgents/SalesAgentFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}
const EditSalesAgent = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Sales Agent">
      <Suspense fallback={<FormSkeleton />}>
        <SalesAgentFormWrapper salesAgentId={id} mode="edit" />
      </Suspense>
    </PageWraper>
  );
};

export default EditSalesAgent;
