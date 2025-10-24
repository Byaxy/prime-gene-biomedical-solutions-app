import { getIncome } from "@/lib/actions/payments.actions";
import { IncomeFilters } from "@/lib/validation";
import IncomeListTable from "./IncomeListTable";

interface IncomeListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: IncomeFilters;
}

const IncomeListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: IncomeListTableDataProps) => {
  const initialData = await getIncome(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );

  return <IncomeListTable initialData={initialData} />;
};

export default IncomeListTableData;
