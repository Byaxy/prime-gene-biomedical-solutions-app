"use client";

import PageWraper from "@/components/PageWraper";
import { customersColumns } from "@/components/table/columns/customersColumns";
import { DataTable } from "@/components/table/DataTable";
import { useCustomers } from "@/hooks/useCustomers";

const Customers = () => {
  const {
    customers,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useCustomers({ initialPageSize: 10 });

  return (
    <PageWraper
      title="Customers"
      buttonText="Add Customer"
      buttonPath="/customers/add-customer"
    >
      <DataTable
        columns={customersColumns}
        data={customers || []}
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

export default Customers;
