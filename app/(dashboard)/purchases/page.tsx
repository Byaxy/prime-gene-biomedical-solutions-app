"use client";

import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { usePurchases } from "@/hooks/usePurchases";
import { purchasesColumns } from "@/components/table/columns/purchasesColumns";

const Purchases = () => {
  const {
    purchases,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    refetch,
    isRefetching,
  } = usePurchases({ initialPageSize: 10 });

  return (
    <PageWraper
      title="Purchases"
      buttonText="Add Purchase"
      buttonPath="/purchases/create-purchase"
    >
      <DataTable
        columns={purchasesColumns}
        data={purchases || []}
        isLoading={isLoading}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        searchBy="purchaseOrderNumber"
        refetch={refetch}
        isRefetching={isRefetching}
      />
    </PageWraper>
  );
};

export default Purchases;
