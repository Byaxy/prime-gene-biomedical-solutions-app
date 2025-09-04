"use client";

import PageWraper from "@/components/PageWraper";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { DataTable } from "@/components/table/DataTable";
import { categoriesColumns } from "@/components/table/columns/categoriesColumns";
import { CategoryFormValues } from "@/lib/validation";
import { useState } from "react";
import { useCategories } from "@/hooks/useCategories";
import toast from "react-hot-toast";
import { exportToExcel } from "@/lib/utils";
import { Category } from "@/types";

const Categories = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

  const {
    categories,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    addCategory,
    isAddingCategory,
    refetch,
    isFetching,
  } = useCategories({ initialPageSize: 10 });

  const handleAddCategory = async (data: CategoryFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addCategory(data, {
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

  const handleDownloadSelected = async (selectedItems: Category[]) => {
    try {
      if (selectedItems.length === 0) {
        toast.error("No Items selected for download");
        return;
      }

      const exportData = selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        parentId: item.parentId ?? "",
        depth: item.depth,
        path: item.path,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
      exportToExcel(exportData, "selected-categories");
      setRowSelection({});
      toast.success("Export started successfully");
    } catch (error) {
      console.error("Error exporting categories:", error);
      toast.error("Failed to export categories");
    }
  };

  return (
    <PageWraper
      title="Categories"
      buttonText="Add Category"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={categoriesColumns}
          data={categories || []}
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
          isFetching={isFetching}
        />
        <CategoryDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingCategory}
          onSubmit={handleAddCategory}
        />
      </>
    </PageWraper>
  );
};

export default Categories;
