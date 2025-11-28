"use client";

import { useAccounts } from "@/hooks/useAccounts";
import { useCommissions } from "@/hooks/useCommissions";
import { useDebounce } from "@/hooks/useDebounce";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useSalesAgents } from "@/hooks/useSalesAgents";
import { CommissionPayoutFilters } from "@/lib/validation";
import {
  AccountWithRelations,
  CommissionWithRelations,
  ExpenseCategoryWithRelations,
  GetCommissionPayoutWithRelations,
  SalesAgentWithRelations,
} from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "../table/DataTable";
import { payoutColumns } from "../table/columns/payoutColumns";

interface CommissionPaymentsListTableProps {
  initialData: { documents: GetCommissionPayoutWithRelations[]; total: number };
}
const CommissionPaymentsListTable: React.FC<
  CommissionPaymentsListTableProps
> = ({ initialData }) => {
  const {
    commissionPayouts,
    totalPayouts,
    payoutPage,
    payoutPageSize,
    payoutSearch,
    payoutFilters,
    isPayoutsLoading,
    isPayoutsFetching,
    setPayoutPage,
    setPayoutPageSize,
    setPayoutSearch,
    setPayoutFilters,
    clearPayoutFilters,
    refetchPayouts,
  } = useCommissions({ initialPayoutsData: initialData });

  const { salesAgents: fetchedSalesAgents } = useSalesAgents({
    getAllSalesAgents: true,
  });
  const { accounts: fetchedAccounts } = useAccounts({ getAllAccounts: true });
  const { expenseCategories: fetchedExpenseCategories } = useExpenseCategories({
    getAllCategories: true,
  });

  const { commissions: allCommissions } = useCommissions({
    getAllCommissions: true,
  });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(payoutSearch);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== payoutSearch) {
      setPayoutSearch(debouncedSearch ?? "");
    }
  }, [debouncedSearch, payoutSearch, setPayoutSearch]);

  // Combine fetched data for filter options
  const salesAgentOptions = useMemo(
    () =>
      fetchedSalesAgents.map((agent: SalesAgentWithRelations) => ({
        label: agent.salesAgent.name,
        value: agent.salesAgent.id,
      })),
    [fetchedSalesAgents]
  );

  const accountOptions = useMemo(
    () =>
      fetchedAccounts.map((account: AccountWithRelations) => ({
        label: `${account.account.name} (${
          account.account.accountNumber || "N/A"
        })`,
        value: account.account.id,
      })),
    [fetchedAccounts]
  );

  const expenseCategoryOptions = useMemo(
    () =>
      fetchedExpenseCategories.map((cat: ExpenseCategoryWithRelations) => ({
        label: cat.expenseCategory.name,
        value: cat.expenseCategory.id,
      })),
    [fetchedExpenseCategories]
  );

  const commissionOptions = useMemo(
    () =>
      allCommissions.map((comm: CommissionWithRelations) => ({
        label: comm.commission.commissionRefNumber,
        value: comm.commission.id,
      })),
    [allCommissions]
  );

  const payoutsFiltersConfig = useMemo(
    () => ({
      payoutRefNumber: {
        type: "text" as const,
        label: "Payout Ref. No.",
      },
      commissionId: {
        type: "select" as const,
        label: "Related Commission",
        options: commissionOptions,
      },
      salesAgentId: {
        type: "select" as const,
        label: "Sales Agent",
        options: salesAgentOptions,
      },
      payingAccountId: {
        type: "select" as const,
        label: "Paying Account",
        options: accountOptions,
      },
      expenseCategoryId: {
        type: "select" as const,
        label: "Expense Category",
        options: expenseCategoryOptions,
      },
      payoutDate: {
        type: "date" as const,
        label: "Payout Date",
      },
      amount: {
        type: "number" as const,
        label: "Amount Paid",
      },
    }),
    [
      commissionOptions,
      salesAgentOptions,
      accountOptions,
      expenseCategoryOptions,
    ]
  );

  const handleSearchChange = useCallback((newSearch: string) => {
    setLocalSearch(newSearch);
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    setPayoutSearch("");
  }, [setPayoutSearch]);

  const handleClearFilters = useCallback(() => {
    setLocalSearch("");
    setPayoutSearch("");
    clearPayoutFilters();
  }, [clearPayoutFilters, setPayoutSearch]);

  const handleFilterChange = useCallback(
    (newFilters: CommissionPayoutFilters) => {
      setPayoutFilters(newFilters);
    },
    [setPayoutFilters]
  );

  return (
    <DataTable
      columns={payoutColumns}
      data={commissionPayouts || []}
      isLoading={isPayoutsLoading}
      isFetching={isPayoutsFetching}
      totalItems={totalPayouts}
      page={payoutPage}
      onPageChange={setPayoutPage}
      pageSize={payoutPageSize}
      onPageSizeChange={setPayoutPageSize}
      refetch={refetchPayouts}
      filters={payoutsFiltersConfig}
      filterValues={payoutFilters}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      searchTerm={localSearch}
      onSearchChange={handleSearchChange}
      onClearSearch={handleClearSearch}
    />
  );
};

export default CommissionPaymentsListTable;
