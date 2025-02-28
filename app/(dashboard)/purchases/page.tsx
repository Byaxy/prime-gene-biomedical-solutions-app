"use client";

import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { usePurchases } from "@/hooks/usePurchases";
import { PurchaseFormValues } from "@/lib/validation";
import { useState } from "react";
import PurchaseSheet from "@/components/purchases/PurchaseSheet";
import { purchasesColumns } from "@/components/table/columns/purchasesColumns";

const Purchases = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    purchases,
    addPurchase,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    isCreatingPurchase,
  } = usePurchases({ initialPageSize: 10 });

  const handleCreatePurchase = async (
    data: PurchaseFormValues
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      addPurchase(data, {
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
      title="Purchases"
      buttonText="Add Purchase"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={purchasesColumns}
          data={purchases || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchBy="purchaseOrderNumber"
        />

        <PurchaseSheet
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isCreatingPurchase}
          onSubmit={handleCreatePurchase}
        />
      </>
    </PageWraper>
  );
};

export default Purchases;
