import AccountFormWrapper from "@/components/accounts/AccountFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

export interface Params {
  id: string;
}

const EditAccount = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Edit Account">
      <Suspense fallback={<FormSkeleton />}>
        <AccountFormWrapper accountId={id} mode="edit" />
      </Suspense>
    </PageWraper>
  );
};

export default EditAccount;
