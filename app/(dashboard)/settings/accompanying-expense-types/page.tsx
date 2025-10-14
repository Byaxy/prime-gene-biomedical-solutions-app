import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { AccompanyingExpenseTypeFilters } from "@/lib/validation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import the client table data wrapper
const AccompanyingExpenseTypeListTableData = dynamic(
  () =>
    import(
      "@/components/accompanyingExpenses/AccompanyingExpenseTypeListTableData"
    ),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

// Define search params type for this page
export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
}

export default async function AccompanyingExpenseTypesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: AccompanyingExpenseTypeFilters = {
    search: sp.search || undefined,
  };

  return (
    <PageWraper
      title="Accompanying Expense Types"
      buttonText="Add Accompanying Type"
      buttonPath="/settings/accompanying-expense-types/create"
    >
      <Suspense fallback={<TableSkeleton />}>
        <AccompanyingExpenseTypeListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
