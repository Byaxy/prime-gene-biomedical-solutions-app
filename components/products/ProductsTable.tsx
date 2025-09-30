"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useBrands } from "@/hooks/useBrands";
import { useCategories } from "@/hooks/useCategories";
import { useTypes } from "@/hooks/useTypes";
import { useUnits } from "@/hooks/useUnits";
import { useDebounce } from "@/hooks/useDebounce";
import { exportToExcel, transformProductsForExport } from "@/lib/utils";
import {
  Brand,
  Category,
  ProductType,
  ProductWithRelations,
  Unit,
} from "@/types";
import toast from "react-hot-toast";
import { DataTable } from "../table/DataTable";
import { productsColumns } from "../table/columns/productsColumns";
import { ProductFilters, useProducts } from "@/hooks/useProducts";
import { ProductDialog } from "./ProductDialog";

interface Props {
  initialData: { documents: ProductWithRelations[]; total: number };
}

const ProductsTable = ({ initialData }: Props) => {
  const [rowSelection, setRowSelection] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ProductWithRelations | null>(
    null
  );

  const {
    products,
    totalItems,
    page,
    pageSize,
    search,
    filters,
    isLoading,
    isFetching,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetch,
    softDeleteMultipleProducts,
    reactivateMultipleProducts,
    isSoftDeletingMultipleProducts,
    isReactivatingMultipleProducts,
  } = useProducts({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  // Get filter options
  const { categories } = useCategories({ getAllCategories: true });
  const { brands } = useBrands({ getAllBrands: true });
  const { types } = useTypes({ getAllTypes: true });
  const { units } = useUnits({ getAllUnits: true });

  // Memoized filter options
  const filterOptions = useMemo(
    () => ({
      categoryOptions:
        categories?.map((category: Category) => ({
          label: category.name,
          value: category.id,
        })) || [],
      brandOptions:
        brands?.map((brand: Brand) => ({
          label: brand.name,
          value: brand.id,
        })) || [],
      typeOptions:
        types?.map((type: ProductType) => ({
          label: type.name,
          value: type.id,
        })) || [],
      unitOptions:
        units?.map((unit: Unit) => ({
          label: unit.name,
          value: unit.id,
        })) || [],
    }),
    [categories, brands, types, units]
  );

  // Filter definitions
  const productFilters = useMemo(
    () => ({
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
        options: filterOptions.categoryOptions,
      },
      brandId: {
        type: "select" as const,
        label: "Brand / Vendor",
        options: filterOptions.brandOptions,
      },
      typeId: {
        type: "select" as const,
        label: "Type",
        options: filterOptions.typeOptions,
      },
      unitId: {
        type: "select" as const,
        label: "Unit",
        options: filterOptions.unitOptions,
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
    }),
    [filterOptions]
  );

  // Event handlers
  const handleSearchChange = useCallback((newSearch: string) => {
    setLocalSearch(newSearch);
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    setSearch("");
  }, [setSearch]);

  const handleClearFilters = useCallback(() => {
    setLocalSearch("");
    setSearch("");
    clearFilters();
  }, [clearFilters, setSearch]);

  const handleFilterChange = useCallback(
    (newFilters: ProductFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  const handleDownloadSelected = useCallback(
    async (selectedItems: ProductWithRelations[]) => {
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
    },
    []
  );

  const handleDeactivateSelected = async (
    selectedItems: ProductWithRelations[]
  ) => {
    const ids = selectedItems.map((item) => item.product.id);
    await softDeleteMultipleProducts(ids, {
      onSuccess: () => setRowSelection({}),
    });
  };
  const handleReactivateSelected = async (
    selectedItems: ProductWithRelations[]
  ) => {
    const ids = selectedItems.map((item) => item.product.id);
    await reactivateMultipleProducts(ids, {
      onSuccess: () => setRowSelection({}),
    });
  };

  const handleRowClick = (rowData: ProductWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  };

  // handle close dialog
  const closeDialog = () => {
    setOpenDialog(false);
    setSelectedRow(null);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

  return (
    <>
      <DataTable
        columns={productsColumns}
        data={products}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onRowClick={handleRowClick}
        onDownloadSelected={handleDownloadSelected}
        onDeactivateSelected={handleDeactivateSelected}
        isDeactivatingSelected={isSoftDeletingMultipleProducts}
        onReactivateSelected={handleReactivateSelected}
        isReactivatingSelected={isReactivatingMultipleProducts}
        refetch={refetch}
        filters={productFilters}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />

      <ProductDialog
        mode={"view"}
        open={openDialog && !!selectedRow}
        onOpenChange={closeDialog}
        product={selectedRow ?? undefined}
      />
    </>
  );
};

export default ProductsTable;
