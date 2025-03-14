"use client";

import CustomerForm from "@/components/forms/CustomerForm";
import PageWraper from "@/components/PageWraper";
import { useCustomers } from "@/hooks/useCustomers";
import { CustomerFormValues } from "@/lib/validation";

const AddCustomer = () => {
  const { addCustomer } = useCustomers();

  const handleAddCustomer = async (data: CustomerFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addCustomer(data, {
        onSuccess: () => {
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };
  return (
    <PageWraper title="Add Customer">
      <section className="space-y-6">
        <CustomerForm mode="create" onSubmit={handleAddCustomer} />
      </section>
    </PageWraper>
  );
};

export default AddCustomer;
