import { getAccounts } from "@/lib/actions/accounting.actions";
import { AccountFilters } from "@/lib/validation";
import AccountListTable from "./AccountListTable";

interface AccountListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  filters: AccountFilters;
}

const AccountListTableData = async ({
  currentPage,
  currentPageSize,
  filters,
}: AccountListTableDataProps) => {
  // Fetch initial data using the server action
  const initialData = await getAccounts(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    filters
  );

  return <AccountListTable initialData={initialData} />;
};

export default AccountListTableData;
