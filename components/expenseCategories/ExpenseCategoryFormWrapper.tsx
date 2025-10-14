import { notFound } from "next/navigation";
import {
  ChartOfAccountWithRelations,
  ExpenseCategoryWithRelations,
} from "@/types";
import { getExpenseCategoryById } from "@/lib/actions/expenseCategories.actions";
import { getChartOfAccounts } from "@/lib/actions/accounting.actions";
import { ExpenseCategoryForm } from "../forms/ExpenseCategoryForm";

interface ExpenseCategoryFormWrapperProps {
  mode: "create" | "edit";
  categoryId?: string;
}

export default async function ExpenseCategoryFormWrapper({
  mode,
  categoryId,
}: ExpenseCategoryFormWrapperProps) {
  const chartOfAccountsData = await getChartOfAccounts();

  const chartOfAccounts: ChartOfAccountWithRelations[] =
    chartOfAccountsData.filter(
      (p: ChartOfAccountWithRelations) => p.account.isActive
    );

  let initialData: ExpenseCategoryWithRelations | undefined = undefined;

  if (mode === "edit") {
    if (!categoryId) notFound();
    const fetchedCategory = await getExpenseCategoryById(categoryId);
    if (!fetchedCategory) notFound();
    initialData = fetchedCategory;
  }

  return (
    <ExpenseCategoryForm
      mode={mode}
      initialData={initialData}
      chartOfAccounts={chartOfAccounts}
    />
  );
}
