import { getIncomeCategories } from "@/lib/actions/incomeCategories.actions";
import { IncomeCategoryFilters } from "@/lib/validation";
import IncomeCategoryListTable from "./IncomeCategoryListTable";

interface IncomeCategoryListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: IncomeCategoryFilters;
}

const IncomeCategoryListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: IncomeCategoryListTableDataProps) => {
  const initialData = await getIncomeCategories(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );

  return <IncomeCategoryListTable initialData={initialData} />;
};

export default IncomeCategoryListTableData;
