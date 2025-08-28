"use client";

import PageWraper from "@/components/PageWraper";
import { productsColumns } from "@/components/table/columns/productsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useBrands } from "@/hooks/useBrands";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useTypes } from "@/hooks/useTypes";
import { useUnits } from "@/hooks/useUnits";
import { exportToExcel, transformProductsForExport } from "@/lib/utils";
import {
  Brand,
  Category,
  ProductType,
  ProductWithRelations,
  Unit,
} from "@/types";
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
    refetch,
    isRefetching,
    filters,
    onFilterChange,
    defaultFilterValues,
  } = useProducts({
    initialPageSize: 10,
  });

  const { categories } = useCategories({ getAllCategories: true });
  const { brands } = useBrands({ getAllBrands: true });
  const { types } = useTypes({ getAllTypes: true });
  const { units } = useUnits({ getAllUnits: true });
  const categoryOptions = categories?.map((category: Category) => ({
    label: category.name,
    value: category.id,
  }));

  const brandOptions = brands?.map((brand: Brand) => ({
    label: brand.name,
    value: brand.id,
  }));
  const typeOptions = types?.map((type: ProductType) => ({
    label: type.name,
    value: type.id,
  }));
  const unitOptions = units?.map((unit: Unit) => ({
    label: unit.name,
    value: unit.id,
  }));

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

  const productFilters = {
    costPrice: {
      type: "number" as const,
      label: "Cost Price",
    },
    sellingPrice: {
      type: "number" as const,
      label: "Selling Price",
    },
    quantity: {
      type: "number" as const,
      label: "Quantity",
    },
    categoryId: {
      type: "select" as const,
      label: "Category",
      options: categoryOptions || [],
    },
    brandId: {
      type: "select" as const,
      label: "Brand / Vendor",
      options: brandOptions || [],
    },
    typeId: {
      type: "select" as const,
      label: "Type",
      options: typeOptions || [],
    },
    unitId: {
      type: "select" as const,
      label: "Unit",
      options: unitOptions || [],
    },
    isActive: {
      type: "select" as const,
      label: "Active Status",
      options: [
        { value: "all", label: "All" },
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
    },
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
        refetch={refetch}
        isRefetching={isRefetching}
        filters={productFilters}
        filterValues={filters}
        onFilterChange={onFilterChange}
        defaultFilterValues={defaultFilterValues}
      />
    </PageWraper>
  );
};

export default Inventory;
