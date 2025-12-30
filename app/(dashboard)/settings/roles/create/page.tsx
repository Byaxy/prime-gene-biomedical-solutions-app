import PageWrapper from "@/components/PageWraper";
import RoleFormWrapper from "@/components/roles/RoleFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreateRolePage = () => {
  return (
    <PageWrapper title="Create Role">
      <Suspense fallback={<FormSkeleton />}>
        <RoleFormWrapper mode="create" />
      </Suspense>
    </PageWrapper>
  );
};

export default CreateRolePage;
