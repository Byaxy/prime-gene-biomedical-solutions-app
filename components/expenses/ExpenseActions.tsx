import { useState } from "react";
import { ExpenseFormValues } from "@/lib/validation";
import { Expense } from "@/types/appwrite.types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useExpenses } from "@/hooks/useExpenses";
import { ExpenseDialog } from "./ExpenseDialog";

const ExpenseActions = ({ expense }: { expense: Expense }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const {
    softDeleteExpense,
    editExpense,
    isSoftDeletingExpense,
    isEditingExpense,
  } = useExpenses();

  const handleAction = async (data: ExpenseFormValues) => {
    // Handle different actions based on mode
    try {
      if (mode === "edit") {
        // Edit expense
        await editExpense(
          { id: expense.$id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        // Delete expense
        await softDeleteExpense(expense.$id, {
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
          setOpen(true);
        }}
        className="text-[#475BE8] p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        onClick={() => {
          setMode("delete");
          setOpen(true);
        }}
        className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md cursor-pointer"
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
