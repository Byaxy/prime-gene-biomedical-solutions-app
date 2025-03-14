"use client";

import ProductForm from "@/components/forms/ProductForm";
import PageWraper from "@/components/PageWraper";
import { useProducts } from "@/hooks/useProducts";
import { ProductFormValues } from "@/lib/validation";

const AddInventory = () => {
  const { addProduct } = useProducts();

  const handleAddProduct = async (data: ProductFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addProduct(data, {
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
    <PageWraper title="Add Inventory">
      <section className="space-y-6">
        <ProductForm mode={"create"} onSubmit={handleAddProduct} />
      </section>
    </PageWraper>
  );
};

export default AddInventory;
