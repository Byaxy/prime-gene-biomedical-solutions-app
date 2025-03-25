"use client";

import ProductForm from "@/components/forms/ProductForm";
import Loading from "@/components/loading";
import PageWraper from "@/components/PageWraper";
import { useProducts } from "@/hooks/useProducts";
import { getProductById } from "@/lib/actions/product.actions";
import { ProductFormValues } from "@/lib/validation";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

const EditInventory = () => {
  const { id } = useParams();
  const { editProduct } = useProducts();

  const { data: product, isLoading } = useQuery({
    queryKey: [id],
    queryFn: async () => {
      if (!id) return null;
      return await getProductById(id as string);
    },
    enabled: !!id,
  });

  const handleEditProduct = async (data: ProductFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      editProduct(
        { id: id as string, data },
        {
          onSuccess: () => {
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <PageWraper title="Edit Inventory">
      <section className="space-y-6">
        <ProductForm
          mode={"edit"}
          onSubmit={handleEditProduct}
          initialData={
            product
              ? {
                  ...product,
                  vendor: product.vendor.$id,
                  category: product.category.$id,
                  unit: product.unit.$id,
                  type: product.type.$id,
                }
              : undefined
          }
        />
      </section>
    </PageWraper>
  );
};

export default EditInventory;
