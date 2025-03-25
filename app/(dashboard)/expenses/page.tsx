"use client";

import PageWraper from "@/components/PageWraper";
import { useExpenses } from "@/hooks/useExpenses";
import { DataTable } from "@/components/table/DataTable";
import { expensesColumns } from "@/components/table/columns/expensesColumns";

const Expenses = () => {
  const {
    expenses,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useExpenses({
    initialPageSize: 10,
  });

  return (
    <PageWraper
      title="Expenses"
      buttonText="Add Expense"
      buttonPath="/expenses/add-expense"
    >
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
      />
    </PageWraper>
  );
};

export default Expenses;
