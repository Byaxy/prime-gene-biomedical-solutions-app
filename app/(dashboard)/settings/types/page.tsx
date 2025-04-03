"use client";

import { useState } from "react";
import PageWraper from "@/components/PageWraper";
import { useTypes } from "@/hooks/useTypes";
import { DataTable } from "@/components/table/DataTable";
import { typesColumns } from "@/components/table/columns/typesColumns";
import ProductTypeDialog from "@/components/productTypes/ProductTypeDialog";
import { TypeFormValues } from "@/lib/validation";
import toast from "react-hot-toast";
import { exportToExcel } from "@/lib/utils";
import { ProductType } from "@/types";

const Types = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

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

  const handleDownloadSelected = async (selectedItems: ProductType[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-types");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting types:", error);
      toast.error("Failed to export types");
    }
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
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onDownloadSelected={handleDownloadSelected}
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
