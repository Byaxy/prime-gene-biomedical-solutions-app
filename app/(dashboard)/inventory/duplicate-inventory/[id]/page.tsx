"use client";

import ProductForm from "@/components/forms/ProductForm";
import Loading from "@/app/(dashboard)/loading";
import PageWraper from "@/components/PageWraper";
import { getProductById } from "@/lib/actions/product.actions";
import { ProductWithRelations } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const DuplicateInventory = () => {
  const { id } = useParams();

  const { data: product, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      const result: ProductWithRelations = await getProductById(id as string);
      return result;
    },
    enabled: !!id,
    staleTime: 0,
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Duplicate Inventory">
      <section className="space-y-6">
        <ProductForm
          mode={"create"}
          initialData={
            product
              ? {
                  ...product.product,
                  quantity: 0,
                }
              : undefined
          }
        />
      </section>
    </PageWraper>
  );
};

export default DuplicateInventory;
