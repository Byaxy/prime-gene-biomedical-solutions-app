"use client";

import PageWraper from "@/components/PageWraper";
import { inventoryTransactionsColumns } from "@/components/table/columns/inventoryTransactionsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useInventoryStock } from "@/hooks/useInventoryStock";

const InventoryAdjustmentList = () => {
  const {
    inventoryTransactions,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    isFetchingTransactions,
    refetch,
    isRefetching,
  } = useInventoryStock({ initialPageSize: 10 });
  return (
    <PageWraper title="Inventory Stock Logs">
      <DataTable
        columns={inventoryTransactionsColumns}
        data={inventoryTransactions || []}
        isLoading={isFetchingTransactions}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        refetch={refetch}
        isRefetching={isRefetching}
      />
    </PageWraper>
  );
};

export default InventoryAdjustmentList;
