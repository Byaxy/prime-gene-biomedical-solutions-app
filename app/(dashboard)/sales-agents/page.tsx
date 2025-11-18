import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const SalesAgentListTableData = dynamic(
  () => import("@/components/salesAgents/SalesAgentListTableData"),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

export default async function SalesAgentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);
  const search = sp.search || undefined;

  return (
    <PageWraper
      title="Sales Agents"
      buttonText="Add Sales Agent"
      buttonPath="/sales-agents/create"
    >
      <Suspense fallback={<TableSkeleton />}>
        <SalesAgentListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          search={search}
        />
      </Suspense>
    </PageWraper>
  );
}
