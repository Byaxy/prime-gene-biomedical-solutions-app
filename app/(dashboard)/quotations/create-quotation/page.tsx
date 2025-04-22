"use client";

import QuotationForm from "@/components/forms/QuotationForm";
import PageWraper from "@/components/PageWraper";

const CreateQuotation = () => {
  return (
    <PageWraper title="Create Quotation">
      <section className="space-y-6">
        <QuotationForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default CreateQuotation;
