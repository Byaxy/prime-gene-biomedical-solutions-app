"use client";

import PurchaseForm from "@/components/forms/PurchaseForm";
import PageWraper from "@/components/PageWraper";
import { usePurchases } from "@/hooks/usePurchases";
import { PurchaseFormValues } from "@/lib/validation";

const CreatePurchase = () => {
  const { addPurchase } = usePurchases();

  const handleCreatePurchase = async (
    data: PurchaseFormValues
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      addPurchase(data, {
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
    <PageWraper title="Create Purchase Order">
      <section className="space-y-6">
        <PurchaseForm mode={"create"} onSubmit={handleCreatePurchase} />
      </section>
    </PageWraper>
  );
};

export default CreatePurchase;
