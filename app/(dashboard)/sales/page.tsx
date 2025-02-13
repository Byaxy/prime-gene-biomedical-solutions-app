"use client";

import { useState } from "react";
import { useSales } from "@/hooks/useSales";
import { SaleFormValues } from "@/lib/validation";
import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { salesColumns } from "@/components/table/columns/salesColumns";
import SaleSheet from "@/components/sales/SaleSheet";

const Sales = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    sales,
    addSale,
    isLoading,
    isAddingSale,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useSales({ initialPageSize: 10 });

  const handleCreateSale = async (data: SaleFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addSale(data, {
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
      title="Sales"
      buttonText="Add Sale"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={salesColumns}
          data={sales || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />

        <SaleSheet
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingSale}
          onSubmit={handleCreateSale}
        />
      </>
    </PageWraper>
  );
};

export default Sales;
