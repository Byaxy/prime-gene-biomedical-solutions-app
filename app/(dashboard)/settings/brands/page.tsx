"use client";

import BrandDialog from "@/components/brands/BrandDialog";
import PageWraper from "@/components/PageWraper";
import { brandColumns } from "@/components/table/columns/brandColumns";
import { DataTable } from "@/components/table/DataTable";
import { useBrands } from "@/hooks/useBrands";
import { exportToExcel } from "@/lib/utils";
import { BrandFormValues } from "@/lib/validation";
import { Brand } from "@/types";
import { useState } from "react";
import toast from "react-hot-toast";

const Brands = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
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
    refetch,
    isRefetching,
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

  const handleDownloadSelected = async (selectedItems: Brand[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        imageId: item.imageId ?? "",
        imageUrl: item.imageUrl ?? "",
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-brands");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting brands:", error);
      toast.error("Failed to export brands");
    }
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
          onDownloadSelected={handleDownloadSelected}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          refetch={refetch}
          isRefetching={isRefetching}
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
