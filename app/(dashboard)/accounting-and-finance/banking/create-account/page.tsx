import AccountFormWrapper from "@/components/accounts/AccountFormWrapper";
import PageWraper from "@/components/PageWraper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const CreateAccount = () => {
  return (
    <PageWraper title="Add Account">
      <Suspense fallback={<FormSkeleton />}>
        <AccountFormWrapper mode="create" />
      </Suspense>
    </PageWraper>
  );
};

export default CreateAccount;
