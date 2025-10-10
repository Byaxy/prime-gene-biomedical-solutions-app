import { notFound } from "next/navigation";
import {
  getChartOfAccounts,
  getAccountById,
} from "@/lib/actions/accounting.actions";
import { parseStringify } from "@/lib/utils";
import { AccountWithRelations, ChartOfAccountWithRelations } from "@/types";
import { AccountForm } from "../forms/AccountForm";

interface AccountFormWrapperProps {
  mode: "create" | "edit";
  accountId?: string;
}

export default async function AccountFormWrapper({
  mode,
  accountId,
}: AccountFormWrapperProps) {
  let initialData: AccountWithRelations | undefined;
  let chartOfAccounts: ChartOfAccountWithRelations[] = [];

  try {
    const fetchedChartOfAccounts = await getChartOfAccounts();
    chartOfAccounts = parseStringify(fetchedChartOfAccounts);

    if (mode === "edit") {
      if (!accountId) {
        notFound();
      }
      const fetchedAccount = await getAccountById(accountId);

      if (!fetchedAccount) {
        notFound();
      }
      initialData = parseStringify(fetchedAccount);
    }
  } catch (error) {
    console.error("Error fetching data for AccountForm:", error);
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-red-600 text-lg">
          Error loading Financial Account form data. Please try again.
        </p>
      </div>
    );
  }

  return (
    <AccountForm
      mode={mode}
      initialData={initialData}
      chartOfAccounts={chartOfAccounts}
    />
  );
}
