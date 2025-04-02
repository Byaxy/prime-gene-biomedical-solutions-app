"use client";

import PageWraper from "@/components/PageWraper";
import { taxColumns } from "@/components/table/columns/taxColumns";
import { DataTable } from "@/components/table/DataTable";
import TaxDialog from "@/components/taxes/TaxDialog";
import { useTaxes } from "@/hooks/useTaxes";
import { TaxFormValues } from "@/lib/validation";
import { useState } from "react";

const Tax = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    taxes,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    addTax,
    isAddingTax,
  } = useTaxes({ initialPageSize: 10 });

  const handleAddTax = async (data: TaxFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addTax(data, {
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
      title="Taxes"
      buttonText="Add Tax"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={taxColumns}
          data={taxes || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
        <TaxDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingTax}
          onSubmit={handleAddTax}
        />
      </>
    </PageWraper>
  );
};

export default Tax;
