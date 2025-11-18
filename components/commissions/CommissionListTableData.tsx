import { getCommissions } from "@/lib/actions/commission.actions";
import { CommissionFilters } from "@/lib/validation";
import CommissionListTable from "./CommissionListTable";

interface CommissionListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: CommissionFilters;
}

const CommissionListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: CommissionListTableDataProps) => {
  const initialData = await getCommissions(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );

  return <CommissionListTable initialData={initialData} />;
};

export default CommissionListTableData;
