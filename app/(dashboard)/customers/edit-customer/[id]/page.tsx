"use client";

import CustomerForm from "@/components/forms/CustomerForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { getCustomerById } from "@/lib/actions/customer.actions";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditCustomer = () => {
  const { id } = useParams();

  const { data: customer, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getCustomerById(id as string);
    },
    enabled: !!id,
    staleTime: 0,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Edit Customer">
      <section className="space-y-6">
        <CustomerForm
          mode={"edit"}
          initialData={customer ? customer : undefined}
        />
      </section>
    </PageWraper>
  );
};

export default EditCustomer;
