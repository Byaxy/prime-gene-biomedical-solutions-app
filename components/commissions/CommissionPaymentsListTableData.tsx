import { CommissionPayoutFilters } from "@/lib/validation";
import { getCommissionPayouts } from "@/lib/actions/commission.actions";
import CommissionPaymentsListTable from "./CommissionPaymentsListTable";

interface CommissionPaymentsListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: CommissionPayoutFilters;
}

const CommissionPaymentsListTableData: React.FC<
  CommissionPaymentsListTableDataProps
> = async ({ currentPage, currentPageSize, filters }) => {
  const initialData = await getCommissionPayouts(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );
  return <CommissionPaymentsListTable initialData={initialData} />;
};

export default CommissionPaymentsListTableData;
