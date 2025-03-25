"use client";

import ExpenseForm from "@/components/forms/ExpenseForm";
import PageWraper from "@/components/PageWraper";
import { useExpenses } from "@/hooks/useExpenses";
import { ExpenseFormValues } from "@/lib/validation";

const AddExpense = () => {
  const { addExpense } = useExpenses();

  const handleAddExpense = async (data: ExpenseFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addExpense(data, {
        onSuccess: () => {
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return (
    <PageWraper title="Add Expense">
      <section className="space-y-6">
        <ExpenseForm mode={"create"} onSubmit={handleAddExpense} />
      </section>
    </PageWraper>
  );
};

export default AddExpense;
