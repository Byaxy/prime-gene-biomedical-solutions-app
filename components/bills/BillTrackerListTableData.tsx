import { getVendors } from "@/lib/actions/vendor.actions";
import { BillTrackerFilters } from "@/lib/validation";
import { Vendor } from "@/types";
import { getBillTrackerData } from "@/lib/actions/bills.actions";
import BillTrackerListTable from "./BillTrackerListTable";

interface BillTrackerListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: BillTrackerFilters;
}

const BillTrackerListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: BillTrackerListTableDataProps) => {
  // Fetch initial data for the tracker list
  const initialData = await getBillTrackerData(
    currentPage,
    currentPageSize,
    filters
  );

  const fetchedVendors = await getVendors(0, 0, true);
  const allVendors: Vendor[] = fetchedVendors.documents;

  return (
    <BillTrackerListTable initialData={initialData} allVendors={allVendors} />
  );
};

export default BillTrackerListTableData;
