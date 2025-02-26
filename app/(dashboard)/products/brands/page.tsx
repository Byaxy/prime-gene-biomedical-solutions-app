"use client";

import BrandDialog from "@/components/brands/BrandDialog";
import PageWraper from "@/components/PageWraper";
import { brandColumns } from "@/components/table/columns/brandColumns";
import { DataTable } from "@/components/table/DataTable";
import { useBrands } from "@/hooks/useBrands";
import { BrandFormValues } from "@/lib/validation";
import { useState } from "react";

const Brands = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    brands,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    addBrand,
    isAddingBrand,
  } = useBrands({ initialPageSize: 10 });

  const handleAddBrand = async (data: BrandFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addBrand(data, {
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
      title="Product Brands"
      buttonText="Add Brand"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={brandColumns}
          data={brands || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
        <BrandDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingBrand}
          onSubmit={handleAddBrand}
        />
      </>
    </PageWraper>
  );
};

export default Brands;
