import PageWrapper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";
import RoleFormWrapper from "@/components/roles/RoleFormWrapper";

export interface Params {
  id: string;
}
const EditRolePage = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;
  return (
    <PageWrapper title="Edit Role">
      <Suspense fallback={<FormSkeleton />}>
        <RoleFormWrapper roleId={id} mode="edit" />
      </Suspense>
    </PageWrapper>
  );
};
export default EditRolePage;
