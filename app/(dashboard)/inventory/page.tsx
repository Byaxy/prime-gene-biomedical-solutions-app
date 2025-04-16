"use client";

import PageWraper from "@/components/PageWraper";
import { productsColumns } from "@/components/table/columns/productsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useProducts } from "@/hooks/useProducts";
import { exportToExcel, transformProductsForExport } from "@/lib/utils";
import { ProductWithRelations } from "@/types";
import { useState } from "react";
import toast from "react-hot-toast";

const Inventory = () => {
  const [rowSelection, setRowSelection] = useState({});

  const {
    products,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    softDeleteMultipleProducts,
    isSoftDeletingMultipleProducts,
  } = useProducts({
    initialPageSize: 10,
  });

  const handleDeleteSelected = async (
    selectedItems: ProductWithRelations[]
  ) => {
    const ids = selectedItems.map((item) => item.product.id);
    await softDeleteMultipleProducts(ids, {
      onSuccess: () => {
        setRowSelection({});
      },
    });
  };

  const handleDownloadSelected = async (
    selectedItems: ProductWithRelations[]
  ) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No products selected for download");
        return;
      }

      const exportData = transformProductsForExport(selectedItems);
      exportToExcel(exportData, "selected-products");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting products:", error);
      toast.error("Failed to export products");
    }
  };

  return (
    <PageWraper
      title="Inventory List"
      buttonText="Add New"
      buttonPath="/inventory/add-inventory"
    >
      <DataTable
        columns={productsColumns}
        data={products || []}
        searchBy={[
          "product.name",
          "product.productID",
          "brand.name",
          "category.name",
          "type.name",
        ]}
        isLoading={isLoading}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onDeleteSelected={handleDeleteSelected}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        isDeletingSelected={isSoftDeletingMultipleProducts}
        onDownloadSelected={handleDownloadSelected}
      />
    </PageWraper>
  );
};

export default Inventory;
