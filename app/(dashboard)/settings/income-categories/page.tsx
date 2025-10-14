import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { IncomeCategoryFilters } from "@/lib/validation";

// Dynamically import the client table data wrapper
const IncomeCategoryListTableData = dynamic(
  () => import("@/components/incomeCategories/IncomeCategoryListTableData"),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  parentId?: string;
  chartOfAccountsId?: string;
}

export default async function IncomeCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: IncomeCategoryFilters = {
    search: sp.search || undefined,
    chartOfAccountsId: sp.chartOfAccountsId || undefined,
  };

  return (
    <PageWraper
      title="Income Categories"
      buttonText="Add Income Category"
      buttonPath="/settings/income-categories/create"
    >
      <Suspense fallback={<TableSkeleton />}>
        <IncomeCategoryListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
