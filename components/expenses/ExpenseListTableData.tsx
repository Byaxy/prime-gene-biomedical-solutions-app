import { ExpenseFilters } from "@/hooks/useExpenses";
import { getExpenses } from "@/lib/actions/expense.actions";
import ExpenseListTable from "./ExpenseListTable";

interface ExpenseListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: ExpenseFilters;
}

const ExpenseListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: ExpenseListTableDataProps) => {
  const initialData = await getExpenses(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );

  return <ExpenseListTable initialData={initialData} />;
};

export default ExpenseListTableData;
