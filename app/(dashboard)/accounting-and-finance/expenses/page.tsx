import PageWraper from "@/components/PageWraper";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ExpenseFilters } from "@/hooks/useExpenses";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import the client table data wrapper
const ExpenseListTableData = dynamic(
  () => import("@/components/expenses/ExpenseListTableData"),
  {
    ssr: true,
    loading: () => <TableSkeleton />,
  }
);

export interface SearchParams {
  page?: string;
  pageSize?: string;
  search?: string;
  expenseCategoryId?: string;
  payingAccountId?: string;
  payee?: string;
  purchaseId?: string;
  accompanyingExpenseTypeId?: string;
  expenseDate_start?: string;
  expenseDate_end?: string;
  amount_min?: string;
  amount_max?: string;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const currentPage = Number(sp.page || 0);
  const currentPageSize = sp.pageSize === "0" ? 0 : Number(sp.pageSize || 10);

  const filtersForServer: ExpenseFilters = {
    search: sp.search || undefined,
    expenseCategoryId: sp.expenseCategoryId || undefined,
    payingAccountId: sp.payingAccountId || undefined,
    payee: sp.payee || undefined,
    purchaseId: sp.purchaseId || undefined,
    accompanyingExpenseTypeId: sp.accompanyingExpenseTypeId || undefined,
    expenseDate_start: sp.expenseDate_start || undefined,
    expenseDate_end: sp.expenseDate_end || undefined,
    amount_min: sp.amount_min ? Number(sp.amount_min) : undefined,
    amount_max: sp.amount_max ? Number(sp.amount_max) : undefined,
  };

  return (
    <PageWraper
      title="Expense Tracker"
      buttonText="Expense Register"
      buttonPath="/accounting-and-finance/expenses/create"
    >
      <Suspense fallback={<TableSkeleton />}>
        <ExpenseListTableData
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          filters={filtersForServer}
        />
      </Suspense>
    </PageWraper>
  );
}
