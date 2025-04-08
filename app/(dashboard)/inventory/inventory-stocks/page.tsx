"use client";

import PageWraper from "@/components/PageWraper";
import { inventoryStockColumns } from "@/components/table/columns/inventoryStockColumns";
import { DataTable } from "@/components/table/DataTable";
import { useInventoryStock } from "@/hooks/useInventoryStock";

const InventoryStocks = () => {
  const {
    inventoryStock,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useInventoryStock({
    initialPageSize: 10,
  });

  return (
    <PageWraper
      title="Inventory Stock List"
      buttonText="Add New/Adjust"
      buttonPath="/inventory/adjust-inventory"
    >
      <DataTable
        columns={inventoryStockColumns}
        data={inventoryStock || []}
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

export default InventoryStocks;
