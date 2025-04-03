"use client";

import PageWraper from "@/components/PageWraper";
import { storesColumns } from "@/components/table/columns/storesColumns";
import { DataTable } from "@/components/table/DataTable";
import StoreDialog from "@/components/stores/StoreDialog";
import { useStores } from "@/hooks/useStores";
import { StoreFormValues } from "@/lib/validation";
import { useState } from "react";
import { Store } from "@/types";
import toast from "react-hot-toast";
import { exportToExcel } from "@/lib/utils";

const Stores = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

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

  const handleDownloadSelected = async (selectedItems: Store[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        location: item.location,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-stores");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting stores:", error);
      toast.error("Failed to export stores");
    }
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
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onDownloadSelected={handleDownloadSelected}
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
