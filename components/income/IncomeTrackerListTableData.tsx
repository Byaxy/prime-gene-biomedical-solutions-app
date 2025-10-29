import { getCustomers } from "@/lib/actions/customer.actions";
import { GetIncomeTrackerDataResponse, Customer } from "@/types";
import IncomeTrackerListTable from "./IncomeTrackerListTable";
import { getIncomeTrackerData } from "@/lib/actions/payments.actions";
import { IncomeTrackerFilters } from "@/lib/validation";
import { getSales } from "@/lib/actions/sale.actions";

interface IncomeTrackerListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: IncomeTrackerFilters;
}

const IncomeTrackerListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: IncomeTrackerListTableDataProps) => {
  // Fetch initial data for the tracker list, including the summary
  const initialData: GetIncomeTrackerDataResponse = await getIncomeTrackerData(
    currentPage,
    currentPageSize,
    filters
  );

  const [fetchedCustomers, fetchedSales] = await Promise.all([
    getCustomers(0, 0, true),
    getSales(0, 0, true),
  ]);
  const allCustomers: Customer[] = fetchedCustomers.documents;
  const allSales = fetchedSales.documents;

  return (
    <IncomeTrackerListTable
      initialData={initialData}
      allCustomers={allCustomers}
      allSales={allSales}
    />
  );
};

export default IncomeTrackerListTableData;
