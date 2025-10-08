import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/navigation";
import { Expense } from "@/types";

const ExpenseActions = ({ expense }: { expense: Expense }) => {
  const router = useRouter();

  return (
    <div className="flex items-center">
      <span
        onClick={() => {
          router.push(`/expenses/edit-expense/${expense.id}`);
        }}
        className="text-[#475BE8] p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        onClick={() => {}}
        className="text-red-600 p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>
    </div>
  );
};

export default ExpenseActions;
