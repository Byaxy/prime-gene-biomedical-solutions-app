"use client";

import SaleForm from "@/components/forms/SaleForm";
import PageWraper from "@/components/PageWraper";
import { useSales } from "@/hooks/useSales";
import { SaleFormValues } from "@/lib/validation";

const CreateInvoice = () => {
  const { addSale } = useSales();

  const handleCreateInvoice = async (data: SaleFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addSale(data, {
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
    <PageWraper title="Create Invoice">
      <section className="space-y-6">
        <SaleForm mode={"create"} onSubmit={handleCreateInvoice} />
      </section>
    </PageWraper>
  );
};

export default CreateInvoice;
