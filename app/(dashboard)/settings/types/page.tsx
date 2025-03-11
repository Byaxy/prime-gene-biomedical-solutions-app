"use client";

import { useState } from "react";
import PageWraper from "@/components/PageWraper";
import { useTypes } from "@/hooks/useTypes";
import { DataTable } from "@/components/table/DataTable";
import { typesColumns } from "@/components/table/columns/typesColumns";
import ProductTypeDialog from "@/components/productTypes/ProductTypeDialog";
import { TypeFormValues } from "@/lib/validation";

const Types = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const {
    types,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    addType,
    isAddingType,
  } = useTypes({ initialPageSize: 10 });

  const handleAddType = async (data: TypeFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addType(data, {
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
      title="Product Types"
      buttonText="Add Type"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={typesColumns}
          data={types || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
        <ProductTypeDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingType}
          onSubmit={handleAddType}
        />
      </>
    </PageWraper>
  );
};

export default Types;
