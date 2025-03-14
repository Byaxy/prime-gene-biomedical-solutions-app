"use client";

import { useSales } from "@/hooks/useSales";
import PageWraper from "@/components/PageWraper";
import { DataTable } from "@/components/table/DataTable";
import { salesColumns } from "@/components/table/columns/salesColumns";

const Sales = () => {
  const { sales, isLoading, totalItems, page, setPage, pageSize, setPageSize } =
    useSales({ initialPageSize: 10 });

  return (
    <PageWraper
      title="Sales"
      buttonText="Create Invoice"
      buttonPath="/sales/create-invoice"
    >
      <DataTable
        columns={salesColumns}
        data={sales || []}
        isLoading={isLoading}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        searchBy="invoiceNumber"
      />
    </PageWraper>
  );
};

export default Sales;
