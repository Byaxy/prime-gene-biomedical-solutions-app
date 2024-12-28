"use client";

import { useState } from "react";
import PageWraper from "@/components/PageWraper";
import { useExpenses } from "@/hooks/useExpenses";
import { ExpenseFormValues } from "@/lib/validation";
import { DataTable } from "@/components/table/DataTable";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { expensesColumns } from "@/components/table/columns/expensesColumns";

const Expenses = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { expenses, isLoading, addExpense, isAddingExpense } = useExpenses();

  const handleAddExpense = async (data: ExpenseFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addExpense(data, {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return (
    <PageWraper
      title="Expenses"
      buttonText="Add Expense"
      buttonAction={() => setIsAddDialogOpen(true)}
    >
      <>
        <DataTable
          columns={expensesColumns}
          data={expenses || []}
          isLoading={isLoading}
        />
        <ExpenseDialog
          mode="add"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          isLoading={isAddingExpense}
          onSubmit={handleAddExpense}
        />
      </>
    </PageWraper>
  );
};

export default Expenses;
