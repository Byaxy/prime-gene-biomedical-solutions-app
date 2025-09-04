"use client";

import { useExpenses } from "@/hooks/useExpenses";
import { expensesColumns } from "../table/columns/expensesColumns";
import { DataTable } from "../table/DataTable";

const ExpensesTable = () => {
  const {
    expenses,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetch,
    isFetching,
  } = useExpenses({
    initialPageSize: 10,
  });

  return (
    <DataTable
      columns={expensesColumns}
      data={expenses || []}
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

export default ExpensesTable;
