"use client";

import PageWraper from "@/components/PageWraper";
import { storesColumns } from "@/components/table/columns/storesColumns";
import { DataTable } from "@/components/table/DataTable";
import { useStores } from "@/hooks/useStores";
import { useState } from "react";
import { Store } from "@/types";
import toast from "react-hot-toast";
import { exportToExcel } from "@/lib/utils";
import AddStoreButton from "@/components/stores/AddStoreButton";

const Stores = () => {
  const [rowSelection, setRowSelection] = useState({});

  const {
    stores,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetch,
    isFetching,
  } = useStores({ initialPageSize: 10 });

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
    <PageWraper title="Stores" buttonAction={<AddStoreButton />}>
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
        refetch={refetch}
        isFetching={isFetching}
      />
    </PageWraper>
  );
};

export default Stores;
