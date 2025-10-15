"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import { ExpenseFilters, useExpenses } from "@/hooks/useExpenses";
import {
  AccompanyingExpenseTypeWithRelations,
  AccountWithRelations,
  ExpenseCategoryWithRelations,
  ExpenseWithRelations,
  PurchaseWithRelations,
} from "@/types";
import { expensesColumns } from "@/components/table/columns/expensesColumns";
import ExpenseDialog from "./ExpenseDialog";

// For filter options
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { usePurchases } from "@/hooks/usePurchases"; // If purchases are needed for filters
import { useAccompanyingExpenseTypes } from "@/hooks/useAccompanyingExpenseTypes";

interface ExpenseListTableProps {
  initialData: { documents: ExpenseWithRelations[]; total: number };
}

const ExpenseListTable: React.FC<ExpenseListTableProps> = ({ initialData }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ExpenseWithRelations>(
    {} as ExpenseWithRelations
  );

  const {
    expenses,
    totalItems,
    page,
    pageSize,
    search,
    filters,
    isLoading,
    isFetching,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetch,
  } = useExpenses({ initialData });

  // Data for filter dropdowns
  const { expenseCategories: allExpenseCategories } = useExpenseCategories({
    getAllCategories: true,
  });
  const { accounts: allAccounts } = useAccounts({ getAllAccounts: true });
  const { purchases: allPurchases } = usePurchases({ getAllPurchases: true });
  const { accompanyingExpenseTypes: allAccompanyingExpenseTypes } =
    useAccompanyingExpenseTypes({ getAllTypes: true });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search to URL/Tanstack Query
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = useCallback((rowData: ExpenseWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  }, []);

  const expensesFiltersConfig = useMemo(
    () => ({
      expenseCategoryId: {
        type: "select" as const,
        label: "Category",
        options: allExpenseCategories.map(
          (cat: ExpenseCategoryWithRelations) => ({
            label: cat.expenseCategory.name,
            value: cat.expenseCategory.id,
          })
        ),
      },
      payingAccountId: {
        type: "select" as const,
        label: "Paying Account",
        options: allAccounts.map((acc: AccountWithRelations) => ({
          label: `${acc.account.name} (${acc.account.accountNumber || "N/A"})`,
          value: acc.account.id,
        })),
      },
      payee: {
        type: "text" as const,
        label: "Payee",
      },
      purchaseId: {
        // For accompanying expenses
        type: "select" as const,
        label: "Linked Purchase",
        options: allPurchases.map((pur: PurchaseWithRelations) => ({
          label: `${pur.purchase.purchaseNumber} - ${pur.vendor.name}`,
          value: pur.purchase.id,
        })),
      },
      accompanyingExpenseTypeId: {
        // For accompanying expenses
        type: "select" as const,
        label: "Accompanying Type",
        options: allAccompanyingExpenseTypes.map(
          (type: AccompanyingExpenseTypeWithRelations) => ({
            label: type.type.name,
            value: type.type.id,
          })
        ),
      },
      expenseDate: {
        type: "date" as const,
        label: "Expense Date",
      },
      amount: {
        type: "number" as const,
        label: "Amount",
      },
    }),
    [
      allExpenseCategories,
      allAccounts,
      allPurchases,
      allAccompanyingExpenseTypes,
    ]
  );

  // Event handlers
  const handleSearchChange = useCallback((newSearch: string) => {
    setLocalSearch(newSearch);
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    setSearch("");
  }, [setSearch]);

  const handleClearFilters = useCallback(() => {
    setLocalSearch("");
    setSearch("");
    clearFilters();
  }, [clearFilters, setSearch]);

  const handleFilterChange = useCallback(
    (newFilters: ExpenseFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  // handle close dialog
  const closeDialog = useCallback(() => {
    setOpenDialog(false);
    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  }, []);

  return (
    <>
      <DataTable
        columns={expensesColumns}
        data={expenses || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={expensesFiltersConfig}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <ExpenseDialog
        mode={"view"}
        open={openDialog && !!selectedRow.expense?.id}
        onOpenChange={closeDialog}
        expense={selectedRow}
      />
    </>
  );
};

export default ExpenseListTable;
