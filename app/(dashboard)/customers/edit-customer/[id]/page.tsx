"use client";

import CustomerForm from "@/components/forms/CustomerForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { useCustomers } from "@/hooks/useCustomers";
import { getCustomerById } from "@/lib/actions/customer.actions";
import { CustomerFormValues } from "@/lib/validation";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditCustomer = () => {
  const { id } = useParams();
  const { editCustomer } = useCustomers();

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

  const handleEditCustomer = async (
    data: CustomerFormValues
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      editCustomer(
        { id: id as string, data },
        {
          onSuccess: () => {
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });
  };
  return (
    <PageWraper title="Edit Customer">
      <section className="space-y-6">
        <CustomerForm
          mode={"edit"}
          onSubmit={handleEditCustomer}
          initialData={customer ? customer : undefined}
        />
      </section>
    </PageWraper>
  );
};

export default EditCustomer;
