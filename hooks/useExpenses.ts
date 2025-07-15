import {
  addExpense,
  deleteExpense,
  editExpense,
  getExpenses,
  softDeleteExpense,
} from "@/lib/actions/expense.actions";
import { ExpenseFormValues } from "@/lib/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface UseExpensesOptions {
  getAllExpenses?: boolean;
  initialPageSize?: number;
}

export const useExpenses = ({
  getAllExpenses = false,
  initialPageSize = 10,
}: UseExpensesOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Query for all Expenses
  const allExpensesQuery = useQuery({
    queryKey: ["expenses", "allExpenses"],
    queryFn: async () => {
      const result = await getExpenses(0, 0, true);
      return result.documents;
    },
    enabled: getAllExpenses,
  });

  // Query for paginated Expenses
  const paginatedExpensesQuery = useQuery({
    queryKey: ["expenses", "paginatedExpenses", page, pageSize],
    queryFn: async () => {
      const result = await getExpenses(page, pageSize, false);
      return result;
    },
    enabled: !getAllExpenses,
  });

  // Prefetch next page for table view
  useEffect(() => {
    if (
      !getAllExpenses &&
      paginatedExpensesQuery.data &&
      page * pageSize < paginatedExpensesQuery.data.total - pageSize
    ) {
      queryClient.prefetchQuery({
        queryKey: ["expenses", "paginatedExpenses", page + 1, pageSize],
        queryFn: () => getExpenses(page + 1, pageSize, false),
      });
    }
  }, [
    page,
    pageSize,
    paginatedExpensesQuery.data,
    queryClient,
    getAllExpenses,
  ]);
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
    expenses: getAllExpenses
      ? allExpensesQuery.data
      : paginatedExpensesQuery.data?.documents || [],
    totalItems: paginatedExpensesQuery.data?.total || 0,
    isLoading: getAllExpenses
      ? allExpensesQuery.isLoading
      : paginatedExpensesQuery.isLoading,
    error: getAllExpenses
      ? allExpensesQuery.error
      : paginatedExpensesQuery.error,
    page,
    setPage,
    pageSize,
    setPageSize,
    addExpense: addExpenseMutation,
    editExpense: editExpenseMutation,
    softDeleteExpense: softDeleteExpenseMutation,
    deleteExpense: deleteExpenseMutation,
    isAddingExpense: addExpenseStatus === "pending",
    isEditingExpense: editExpenseStatus === "pending",
    isDeletingExpense: deleteExpenseStatus === "pending",
    isSoftDeletingExpense: softDeleteExpenseStatus === "pending",
    refetch: getAllExpenses
      ? allExpensesQuery.refetch
      : paginatedExpensesQuery.refetch,
    isRefetching: getAllExpenses
      ? allExpensesQuery.isRefetching
      : paginatedExpensesQuery.isRefetching,
  };
};
