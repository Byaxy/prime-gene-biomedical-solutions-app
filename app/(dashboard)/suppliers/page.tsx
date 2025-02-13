"use client";

import { useState } from "react";
import PageWraper from "@/components/PageWraper";
import SupplierDialog from "@/components/suppliers/SupplierDialog";
import { suppliersColumns } from "@/components/table/columns/suppliersColumns";
import { DataTable } from "@/components/table/DataTable";
import { useSuppliers } from "@/hooks/useSuppliers";
import { SupplierFormValues } from "@/lib/validation";

const Suppliers = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    suppliers,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    addSupplier,
    isAddingSupplier,
  } = useSuppliers({ initialPageSize: 10 });

  const handleAddSupplier = async (data: SupplierFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addSupplier(data, {
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
      title="Suppliers"
      buttonText="Add Supplier"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={suppliersColumns}
          data={suppliers || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />

        <SupplierDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingSupplier}
          onSubmit={handleAddSupplier}
        />
      </>
    </PageWraper>
  );
};

export default Suppliers;
