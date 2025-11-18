import { getSalesAgents } from "@/lib/actions/salesAgent.actions";
import SalesAgentListTable from "./SalesAgentListTable";

interface SalesAgentListTableDataProps {
  currentPage: number;
  currentPageSize: number;
  search?: string;
}

const SalesAgentListTableData = async ({
  currentPage,
  currentPageSize,
  search,
}: SalesAgentListTableDataProps) => {
  const initialData = await getSalesAgents(
    currentPage,
    currentPageSize,
    currentPageSize === 0,
    { search }
  );

  return <SalesAgentListTable initialData={initialData} />;
};

export default SalesAgentListTableData;
