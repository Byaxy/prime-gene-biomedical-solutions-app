"use client";

import PurchaseForm from "@/components/forms/PurchaseForm";
import PageWraper from "@/components/PageWraper";

const CreatePurchase = () => {
  return (
    <PageWraper title="Create Purchase">
      <section className="space-y-6">
        <PurchaseForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default CreatePurchase;
