import { getCommissionById } from "@/lib/actions/commission.actions";
import PayCommissionForm from "../forms/PayCommissionForm";
import { getAccounts } from "@/lib/actions/accounting.actions";
import { getExpenseCategories } from "@/lib/actions/expenseCategories.actions";

interface PayCommissionFormWrapperProps {
  commissionId: string;
}

const PayCommissionFormWrapper = async ({
  commissionId,
}: PayCommissionFormWrapperProps) => {
  const [fetchedAccounts, fetchedExpenseCategories] = await Promise.all([
    getAccounts(0, 0, true),
    getExpenseCategories(0, 0, true),
  ]);
  const commission = await getCommissionById(commissionId);

  const accounts = fetchedAccounts.documents;
  const expenseCategories = fetchedExpenseCategories.documents;

  return (
    <PayCommissionForm
      commission={commission}
      accounts={accounts}
      expenseCategories={expenseCategories}
    />
  );
};

export default PayCommissionFormWrapper;
