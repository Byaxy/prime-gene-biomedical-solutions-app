import {
  addExpense,
  deleteExpense,
  editExpense,
  getExpenses,
  softDeleteExpense,
} from "@/lib/actions/expense.actions";
import { ExpenseFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useExpenses = () => {
  const queryClient = useQueryClient();

  // Get all expenses
  const {
    data: expenses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const result = await getExpenses();

      if (!result) {
        throw new Error("Failed to fetch expenses");
      }
      return result;
    },
  });

  // Add expense mutation
  const { mutate: addExpenseMutation, status: addExpenseStatus } = useMutation({
    mutationFn: (data: ExpenseFormValues) => addExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense added successfully");
    },
    onError: (error) => {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    },
  });

  // Edit expense mutation
  const { mutate: editExpenseMutation, status: editExpenseStatus } =
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: ExpenseFormValues }) =>
        editExpense(data, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        toast.success("Expense updated successfully");
      },
      onError: (error) => {
        console.error("Error updating expense:", error);
        toast.error("Failed to update expense");
      },
    });

  // Soft Delete expense mutation
  const { mutate: softDeleteExpenseMutation, status: softDeleteExpenseStatus } =
    useMutation({
      mutationFn: (id: string) => softDeleteExpense(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        toast.success("Expense deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting expense:", error);
        toast.error("Failed to delete expense");
      },
    });

  // Permanently Delete expense mutation
  const { mutate: deleteExpenseMutation, status: deleteExpenseStatus } =
    useMutation({
      mutationFn: (id: string) => deleteExpense(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        toast.success("Expense deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting expense:", error);
        toast.error("Failed to delete expense");
      },
    });

  return {
    expenses,
    isLoading,
    error,
    addExpense: addExpenseMutation,
    editExpense: editExpenseMutation,
    softDeleteExpense: softDeleteExpenseMutation,
    deleteExpense: deleteExpenseMutation,
    isAddingExpense: addExpenseStatus === "pending",
    isEditingExpense: editExpenseStatus === "pending",
    isDeletingExpense: deleteExpenseStatus === "pending",
    isSoftDeletingExpense: softDeleteExpenseStatus === "pending",
  };
};
