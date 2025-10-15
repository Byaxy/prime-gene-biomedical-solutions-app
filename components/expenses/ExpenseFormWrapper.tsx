import { notFound } from "next/navigation";
import { getPurchases } from "@/lib/actions/purchase.actions";
import { parseStringify } from "@/lib/utils";
import {
  ExpenseCategoryWithRelations,
  AccountWithRelations,
  AccompanyingExpenseTypeWithRelations,
  PurchaseWithRelations,
  ExpenseWithRelations,
} from "@/types";
import { getExpenseCategories } from "@/lib/actions/expenseCategories.actions";
import { getAccounts } from "@/lib/actions/accounting.actions";
import { getAccompanyingExpenseTypes } from "@/lib/actions/accompanyingExpenses.actions";
import {
  generateExpenseReferenceNumber,
  getExpenseById,
} from "@/lib/actions/expense.actions";
import { ExpenseForm } from "../forms/ExpenseForm";

interface ExpenseFormWrapperProps {
  mode: "create" | "edit";
  expenseId?: string;
}

export default async function ExpenseFormWrapper({
  mode,
  expenseId,
}: ExpenseFormWrapperProps) {
  let initialData: ExpenseWithRelations | undefined;
  let expenseCategories: ExpenseCategoryWithRelations[] = [];
  let payingAccounts: AccountWithRelations[] = [];
  let accompanyingExpenseTypes: AccompanyingExpenseTypeWithRelations[] = [];
  let purchases: PurchaseWithRelations[] = [];
  let generatedReferenceNumber: string | undefined = undefined;

  const [
    fetchedExpenseCategories,
    fetchedAccounts,
    fetchedAccompanyingTypes,
    fetchedPurchases,
  ] = await Promise.all([
    getExpenseCategories(0, 0, true),
    getAccounts(0, 0, true),
    getAccompanyingExpenseTypes(0, 0, true),
    getPurchases(0, 0, true),
  ]);

  expenseCategories = parseStringify(fetchedExpenseCategories.documents);

  payingAccounts = parseStringify(
    fetchedAccounts.documents.filter(
      (acc: AccountWithRelations) => acc.account.isActive
    )
  );

  accompanyingExpenseTypes = parseStringify(fetchedAccompanyingTypes.documents);

  purchases = parseStringify(
    fetchedPurchases.documents.filter(
      (p: PurchaseWithRelations) => p.purchase.isActive
    )
  );

  if (mode === "edit") {
    if (!expenseId) notFound();
    const fetchedExpense = await getExpenseById(expenseId);
    if (!fetchedExpense) notFound();
    initialData = parseStringify(fetchedExpense);
  } else if (mode === "create") {
    generatedReferenceNumber = await generateExpenseReferenceNumber();
  }

  return (
    <ExpenseForm
      mode={mode}
      initialData={initialData}
      expenseCategories={expenseCategories}
      payingAccounts={payingAccounts}
      accompanyingExpenseTypes={accompanyingExpenseTypes}
      purchases={purchases}
      generatedReferenceNumber={generatedReferenceNumber}
    />
  );
}
