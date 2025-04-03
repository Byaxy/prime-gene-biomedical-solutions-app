"use client";

import ProductForm from "@/components/forms/ProductForm";
import PageWraper from "@/components/PageWraper";
import { ProductDialog } from "@/components/products/ProductDialog";
import { useState } from "react";

const AddInventory = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  return (
    <PageWraper
      title="Add Inventory"
      buttonText="Uplaod Bulk"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <section className="space-y-6">
        <ProductForm mode={"create"} />
        <ProductDialog
          mode={"add"}
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isBulkProductUpload={true}
        />
      </section>
    </PageWraper>
  );
};

export default AddInventory;
