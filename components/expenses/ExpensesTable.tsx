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
    isRefetching,
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
      searchBy="title"
      refetch={refetch}
      isRefetching={isRefetching}
    />
  );
};

export default ExpensesTable;
