import { getAccompanyingExpenseTypes } from "@/lib/actions/accompanyingExpenses.actions";
import { AccompanyingExpenseTypeFilters } from "@/lib/validation";
import AccompanyingExpenseTypeListTable from "./AccompanyingExpenseTypeListTable";

interface AccompanyingExpenseTypeListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: AccompanyingExpenseTypeFilters;
}

const AccompanyingExpenseTypeListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: AccompanyingExpenseTypeListTableDataProps) => {
  const initialData = await getAccompanyingExpenseTypes(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );

  return <AccompanyingExpenseTypeListTable initialData={initialData} />;
};

export default AccompanyingExpenseTypeListTableData;
