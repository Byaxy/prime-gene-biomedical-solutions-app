import { getRoles } from "@/lib/actions/role.actions";
import RolesListTable from "./RolesListTable";

interface RolesListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  search?: string;
}

const RolesListTableData = async ({
  currentPage,
  currentPageSize,
}: RolesListTableDataProps) => {
  const initialData = await getRoles(
    currentPage,
    currentPageSize,
    currentPageSize === 0
  );

  return <RolesListTable initialData={initialData} />;
};

export default RolesListTableData;
