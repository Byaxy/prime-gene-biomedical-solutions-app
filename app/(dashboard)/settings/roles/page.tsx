import PageWrapper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const RolesListTableData = dynamic(
  () => import("@/components/roles/RolesListTableData"),
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

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);
  const search = sp.search || undefined;

  return (
    <PageWrapper
      title="Roles Management"
      buttonText="Create Role"
      buttonPath="/settings/roles/create"
    >
      <Suspense fallback={<TableSkeleton />}>
        <RolesListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          search={search}
        />
      </Suspense>
    </PageWrapper>
  );
}
