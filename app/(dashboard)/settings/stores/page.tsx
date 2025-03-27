"use client";

import PageWraper from "@/components/PageWraper";
import { storesColumns } from "@/components/table/columns/storesColumns";
import { DataTable } from "@/components/table/DataTable";
import StoreDialog from "@/components/stores/StoreDialog";
import { useStores } from "@/hooks/useStores";
import { StoreFormValues } from "@/lib/validation";
import { useState } from "react";

const Stores = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const {
    stores,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    addStore,
    isAddingStore,
  } = useStores({ initialPageSize: 10 });

  const handleAddStore = async (data: StoreFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addStore(data, {
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
      title="Stores"
      buttonText="Add Store"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={storesColumns}
          data={stores || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
        <StoreDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingStore}
          onSubmit={handleAddStore}
        />
      </>
    </PageWraper>
  );
};

export default Stores;
