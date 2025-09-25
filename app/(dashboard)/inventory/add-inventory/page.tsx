import BulkUploadButton from "@/components/BulkUploadButton";
import PageWraper from "@/components/PageWraper";
import ProductFormWrapper from "@/components/products/ProductFormWrapper";
import FormSkeleton from "@/components/ui/form-skeleton";
import { Suspense } from "react";

const AddInventory = () => {
  return (
    <PageWraper title="Add Inventory" buttonAction={<BulkUploadButton />}>
      <section className="space-y-6">
        <Suspense fallback={<FormSkeleton />}>
          <ProductFormWrapper mode={"create"} />
        </Suspense>
      </section>
    </PageWraper>
  );
};

export default AddInventory;
