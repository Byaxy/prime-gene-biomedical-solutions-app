import { getReceipts } from "@/lib/actions/receipts.actions";
import { ReceiptFilters } from "@/lib/validation";
import ReceiptListTable from "./ReceiptListTable";
import { Customer } from "@/types";
import { getCustomers } from "@/lib/actions/customer.actions";

interface ReceiptListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: ReceiptFilters;
}

const ReceiptListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: ReceiptListTableDataProps) => {
  const [initialData, fetchedCustomers] = await Promise.all([
    getReceipts(currentPage, currentPageSize, currentPageSize === 0, filters),
    getCustomers(0, 0, true), // Fetch all customers for filter options
  ]);

  const allCustomers: Customer[] = fetchedCustomers.documents;

  return (
    <ReceiptListTable initialData={initialData} allCustomers={allCustomers} />
  );
};

export default ReceiptListTableData;
