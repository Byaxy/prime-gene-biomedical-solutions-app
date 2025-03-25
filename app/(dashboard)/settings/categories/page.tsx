"use client";

import PageWraper from "@/components/PageWraper";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { DataTable } from "@/components/table/DataTable";
import { categoriesColumns } from "@/components/table/columns/categoriesColumns";
import { CategoryFormValues } from "@/lib/validation";
import { useState } from "react";
import { useCategories } from "@/hooks/useCategories";

const Categories = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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
  } = useCategories({ initialPageSize: 10 });

  console.log(categories);

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
