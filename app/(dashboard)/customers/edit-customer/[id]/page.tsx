import Loading from "@/app/(dashboard)/loading";
import EditCustomerPage from "@/components/customers/EditCustomerPage";
import PageWraper from "@/components/PageWraper";
import { Suspense, use } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

const EditCustomer = ({ params }: Props) => {
  const { id } = use(params);

  return (
    <PageWraper title="Edit Customer">
      <Suspense fallback={<Loading />}>
        <EditCustomerPage customerId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default EditCustomer;
