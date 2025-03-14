"use client";

import QuotationForm from "@/components/forms/QuotationForm";
import PageWraper from "@/components/PageWraper";
import { useQuotations } from "@/hooks/useQuotations";
import { QuotationFormValues } from "@/lib/validation";

const CreateQuotation = () => {
  const { addQuotation } = useQuotations();

  const handleCreateQuotation = async (
    data: QuotationFormValues
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      addQuotation(data, {
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
    <PageWraper title="Create Quotation">
      <section className="space-y-6">
        <QuotationForm mode={"create"} onSubmit={handleCreateQuotation} />
      </section>
    </PageWraper>
  );
};

export default CreateQuotation;
