"use client";

import PageWraper from "@/components/PageWraper";
import { ProductDialog } from "@/components/products/ProductDialog";
import { productsColumns } from "@/components/table/columns/productsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useProducts } from "@/hooks/useProducts";
import { ProductFormValues } from "@/lib/validation";
import { useState } from "react";

const Products = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { products, isLoading, addProduct, isAddingProduct } = useProducts();

  const handleAddProduct = async (data: ProductFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addProduct(data, {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return (
    <PageWraper
      title="Products"
      buttonText="Add Product"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={productsColumns}
          data={products || []}
          isLoading={isLoading}
        />
        <ProductDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingProduct}
          onSubmit={handleAddProduct}
        />
      </>
    </PageWraper>
  );
};

export default Products;
