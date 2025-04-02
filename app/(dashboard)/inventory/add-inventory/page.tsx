"use client";

import ProductForm from "@/components/forms/ProductForm";
import PageWraper from "@/components/PageWraper";

const AddInventory = () => {
  return (
    <PageWraper title="Add Inventory">
      <section className="space-y-6">
        <ProductForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default AddInventory;
