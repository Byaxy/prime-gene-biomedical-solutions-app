"use client";

import { useCustomers } from "@/hooks/useCustomers";
import { DataTable } from "../table/DataTable";
import { customersColumns } from "../table/columns/customersColumns";

const CustomersTable = () => {
  const {
    customers,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetch,
    isFetching,
  } = useCustomers({ initialPageSize: 10 });

  return (
    <DataTable
      columns={customersColumns}
      data={customers || []}
      isLoading={isLoading}
      totalItems={totalItems}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      refetch={refetch}
      isFetching={isFetching}
    />
  );
};

export default CustomersTable;
