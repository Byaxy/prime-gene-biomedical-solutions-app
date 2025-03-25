import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useExpenses } from "@/hooks/useExpenses";
import { ExpenseDialog } from "./ExpenseDialog";
import { useRouter } from "next/navigation";
import { Expense } from "@/types";

const ExpenseActions = ({ expense }: { expense: Expense }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const router = useRouter();

  const { softDeleteExpense, isSoftDeletingExpense, isEditingExpense } =
    useExpenses();

  const handleAction = async () => {
    try {
      if (mode === "delete") {
        // Delete expense
        await softDeleteExpense(expense.id, {
          onSuccess: () => setOpen(false),
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="flex items-center">
      <span
        onClick={() => {
          setMode("edit");
          router.push(`/expenses/edit-expense/${expense.id}`);
        }}
        className="text-[#475BE8] p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        onClick={() => {
          setMode("delete");
          setOpen(true);
        }}
        className="text-red-600 p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>
      <ExpenseDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        expense={expense}
        onSubmit={handleAction}
        isLoading={isSoftDeletingExpense || isEditingExpense}
      />
    </div>
  );
};

export default ExpenseActions;
