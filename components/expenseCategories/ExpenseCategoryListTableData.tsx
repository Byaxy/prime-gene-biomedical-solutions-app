import { getExpenseCategories } from "@/lib/actions/expenseCategories.actions";
import { ExpenseCategoryFilters } from "@/lib/validation";
import ExpenseCategoryListTable from "./ExpenseCategoryListTable";

interface ExpenseCategoryListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: ExpenseCategoryFilters;
}

const ExpenseCategoryListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: ExpenseCategoryListTableDataProps) => {
  const initialData = await getExpenseCategories(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );

  return <ExpenseCategoryListTable initialData={initialData} />;
};

export default ExpenseCategoryListTableData;
