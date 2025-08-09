"use client";

import PurchaseOrderForm from "@/components/forms/PurchaseOrderForm";
import PageWraper from "@/components/PageWraper";

const CreatePurchase = () => {
  return (
    <PageWraper title="Create Purchase Order">
      <section className="space-y-6">
        <PurchaseOrderForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default CreatePurchase;
