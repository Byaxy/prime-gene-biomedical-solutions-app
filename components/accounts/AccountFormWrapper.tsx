import { notFound } from "next/navigation";
import {
  getChartOfAccounts,
  getAccountById,
} from "@/lib/actions/accounting.actions";
import { parseStringify } from "@/lib/utils";
import {
  AccountWithRelations,
  ChartOfAccountType,
  ChartOfAccountWithRelations,
} from "@/types";
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
    const allChartOfAccounts = parseStringify(fetchedChartOfAccounts);

    // Filter to only include active 'asset' type accounts for linking
    chartOfAccounts = allChartOfAccounts
      .flatMap((item: ChartOfAccountWithRelations) => {
        // Flatten the tree
        const flatItems: ChartOfAccountWithRelations[] = [
          { account: item.account, children: [] },
        ];
        const addChildrenRecursively = (
          children: ChartOfAccountWithRelations[]
        ) => {
          children.forEach((child) => {
            flatItems.push({ account: child.account, children: [] });
            if (child.children) addChildrenRecursively(child.children);
          });
        };
        if (item.children) addChildrenRecursively(item.children);
        return flatItems;
      })
      .filter(
        (item: ChartOfAccountWithRelations) =>
          item.account.isActive &&
          item.account.accountType === ChartOfAccountType.ASSET
      );

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
