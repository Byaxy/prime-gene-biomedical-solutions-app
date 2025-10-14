import { notFound } from "next/navigation";
import { parseStringify } from "@/lib/utils";
import {
  AccompanyingExpenseTypeWithRelations,
  ExpenseCategoryWithRelations,
} from "@/types";
import { getAccompanyingExpenseTypeById } from "@/lib/actions/accompanyingExpenses.actions";
import { getExpenseCategories } from "@/lib/actions/expenseCategories.actions";
import { AccompanyingExpenseTypeForm } from "../forms/AccompanyingExpenseTypeForm";

interface AccompanyingExpenseTypeFormWrapperProps {
  mode: "create" | "edit";
  typeId?: string;
}

export default async function AccompanyingExpenseTypeFormWrapper({
  mode,
  typeId,
}: AccompanyingExpenseTypeFormWrapperProps) {
  let initialData: AccompanyingExpenseTypeWithRelations | undefined;

  const fetchedExpenseCategories = await getExpenseCategories(0, 0, true);

  const expenseCategories: ExpenseCategoryWithRelations[] =
    fetchedExpenseCategories.documents.filter(
      (cat: ExpenseCategoryWithRelations) =>
        cat.expenseCategory.isActive &&
        cat.chartOfAccount?.accountType === "expense"
    );

  if (mode === "edit") {
    if (!typeId) notFound();
    const fetchedInitialData = await getAccompanyingExpenseTypeById(typeId);

    if (!fetchedInitialData) notFound();
    initialData = parseStringify(fetchedInitialData);
  }

  return (
    <AccompanyingExpenseTypeForm
      mode={mode}
      initialData={initialData}
      expenseCategories={expenseCategories}
    />
  );
}
