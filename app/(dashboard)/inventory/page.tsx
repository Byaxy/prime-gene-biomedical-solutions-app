"use client";

import PageWraper from "@/components/PageWraper";
import { productsColumns } from "@/components/table/columns/productsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useProducts } from "@/hooks/useProducts";

const Inventory = () => {
  const {
    products,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useProducts({
    initialPageSize: 10,
  });

  return (
    <PageWraper
      title="Inventory List"
      buttonText="Add New"
      buttonPath="/inventory/add-inventory"
    >
      <DataTable
        columns={productsColumns}
        data={products || []}
        isLoading={isLoading}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </PageWraper>
  );
};

export default Inventory;
