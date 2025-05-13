"use client";

import SaleForm from "@/components/forms/SaleForm";
import PageWraper from "@/components/PageWraper";

const CreateInvoice = () => {
  return (
    <PageWraper title="Create Invoice">
      <section className="space-y-6">
        <SaleForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default CreateInvoice;
