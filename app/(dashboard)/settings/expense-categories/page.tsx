import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ExpenseCategoryFilters } from "@/lib/validation";

// Dynamically import the client table data wrapper
const ExpenseCategoryListTableData = dynamic(
  () => import("@/components/expenseCategories/ExpenseCategoryListTableData"),
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

export default async function ExpenseCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: ExpenseCategoryFilters = {
    search: sp.search || undefined,
    parentId: sp.parentId || undefined,
    chartOfAccountsId: sp.chartOfAccountsId || undefined,
  };

  return (
    <PageWraper
      title="Expense Categories"
      buttonText="Add Expense Category"
      buttonPath="/settings/expense-categories/create"
    >
      <Suspense fallback={<TableSkeleton />}>
        <ExpenseCategoryListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
