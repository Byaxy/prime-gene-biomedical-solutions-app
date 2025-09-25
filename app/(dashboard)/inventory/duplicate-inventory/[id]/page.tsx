import PageWraper from "@/components/PageWraper";
import { Suspense } from "react";
import FormSkeleton from "@/components/ui/form-skeleton";
import ProductFormWrapper from "@/components/products/ProductFormWrapper";

export interface Params {
  id: string;
}

const DuplicateInventory = async ({ params }: { params: Promise<Params> }) => {
  const { id } = await params;

  return (
    <PageWraper title="Duplicate Inventory">
      <Suspense fallback={<FormSkeleton />}>
        <ProductFormWrapper mode="duplicate" productId={id} />
      </Suspense>
    </PageWraper>
  );
};

export default DuplicateInventory;
