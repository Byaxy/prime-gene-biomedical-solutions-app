import { notFound } from "next/navigation";
import {
  getChartOfAccounts,
  getChartOfAccountById,
} from "@/lib/actions/accounting.actions";
import { parseStringify } from "@/lib/utils";
import { ChartOfAccountWithRelations } from "@/types";
import ChartOfAccountForm from "../forms/ChartOfAccountsForm";

interface ChartOfAccountsFormWrapperProps {
  mode: "create" | "edit";
  chartOfAccountId?: string;
}

export default async function ChartOfAccountsFormWrapper({
  mode,
  chartOfAccountId,
}: ChartOfAccountsFormWrapperProps) {
  let initialData: ChartOfAccountWithRelations | undefined = undefined;
  let parentAccounts: ChartOfAccountWithRelations[] = [];

  try {
    const fetchedParentAccounts = await getChartOfAccounts();

    parentAccounts = parseStringify(fetchedParentAccounts);

    parentAccounts = parentAccounts.filter((p) => p.account.isActive);

    if (mode === "edit") {
      if (!chartOfAccountId) {
        notFound();
      }
      const fetchedInitialData = await getChartOfAccountById(chartOfAccountId);

      if (!fetchedInitialData) {
        notFound();
      }
      initialData = parseStringify(fetchedInitialData);

      initialData = {
        account: parseStringify(fetchedInitialData),
        children: [],
      } as ChartOfAccountWithRelations;

      parentAccounts = parentAccounts.filter(
        (acc) => acc.account.id !== chartOfAccountId
      );
    }
  } catch (error) {
    console.error("Error fetching data for ChartOfAccountsForm:", error);
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-red-600 text-lg">
          Error loading Chart of Account data. Please try again.
        </p>
      </div>
    );
  }

  return (
    <ChartOfAccountForm
      mode={mode}
      initialData={initialData}
      parentAccounts={parentAccounts}
    />
  );
}
