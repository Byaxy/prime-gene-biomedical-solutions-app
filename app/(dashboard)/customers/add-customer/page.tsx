"use client";

import CustomerForm from "@/components/forms/CustomerForm";
import PageWraper from "@/components/PageWraper";

const AddCustomer = () => {
  return (
    <PageWraper title="Add Customer">
      <section className="space-y-6">
        <CustomerForm mode="create" />
      </section>
    </PageWraper>
  );
};

export default AddCustomer;
