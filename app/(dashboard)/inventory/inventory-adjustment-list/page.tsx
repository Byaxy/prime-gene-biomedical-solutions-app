"use client";

import PageWraper from "@/components/PageWraper";
import { inventoryTransactionsColumns } from "@/components/table/columns/inventoryTransactionsColumns";
import { DataTable } from "@/components/table/DataTable";
import { useInventoryStock } from "@/hooks/useInventoryStock";

const InventoryAdjustmentList = () => {
  const {
    inventoryTransactions,
    totalTransactions: totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    isTransactionsLoading,
    refetch,
    isFetchingTransactions,
  } = useInventoryStock({ initialPageSize: 10 });
  return (
    <PageWraper title="Inventory Stock Logs">
      <DataTable
        columns={inventoryTransactionsColumns}
        data={inventoryTransactions || []}
        isLoading={isTransactionsLoading}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        refetch={refetch}
        isFetching={isFetchingTransactions}
      />
    </PageWraper>
  );
};

export default InventoryAdjustmentList;
