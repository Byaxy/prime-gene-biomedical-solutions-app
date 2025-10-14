import { notFound } from "next/navigation";
import {
  ChartOfAccountWithRelations,
  IncomeCategoryWithRelations,
} from "@/types";
import { getIncomeCategoryById } from "@/lib/actions/incomeCategories.actions";
import { getChartOfAccounts } from "@/lib/actions/accounting.actions";
import { IncomeCategoryForm } from "../forms/IncomeCategoryForm";

interface IncomeCategoryFormWrapperProps {
  mode: "create" | "edit";
  categoryId?: string;
}

export default async function IncomeCategoryFormWrapper({
  mode,
  categoryId,
}: IncomeCategoryFormWrapperProps) {
  const chartOfAccountsData = await getChartOfAccounts();

  const chartOfAccounts: ChartOfAccountWithRelations[] =
    chartOfAccountsData.filter(
      (p: ChartOfAccountWithRelations) => p.account.isActive
    );

  let initialData: IncomeCategoryWithRelations | undefined = undefined;

  if (mode === "edit") {
    if (!categoryId) notFound();
    const fetchedCategory = await getIncomeCategoryById(categoryId);
    if (!fetchedCategory) notFound();
    initialData = fetchedCategory;
  }

  return (
    <IncomeCategoryForm
      mode={mode}
      initialData={initialData}
      chartOfAccounts={chartOfAccounts}
    />
  );
}
