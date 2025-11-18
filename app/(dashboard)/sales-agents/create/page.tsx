import SalesAgentFormWrapper from "@/components/salesAgents/SalesAgentFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreateSalesAgent = () => {
  return (
    <PageWraper title="Create Sales Agent">
      <Suspense fallback={<FormSkeleton />}>
        <SalesAgentFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateSalesAgent;
