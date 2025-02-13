"use client";

import PageWraper from "@/components/PageWraper";
//import { ProductDialog } from "@/components/products/ProductDialog";
import ProductSheet from "@/components/products/ProductSheet";
import { productsColumns } from "@/components/table/columns/productsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useProducts } from "@/hooks/useProducts";
import { ProductFormValues } from "@/lib/validation";
import { useState } from "react";

const Products = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    products,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    addProduct,
    isAddingProduct,
  } = useProducts({
    initialPageSize: 10,
  });

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
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
        <ProductSheet
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
