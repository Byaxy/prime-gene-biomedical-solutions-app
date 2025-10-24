"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import { IncomeFilters } from "@/lib/validation";
import { useIncome } from "@/hooks/useIncome";
import {
  AccountWithRelations,
  Customer,
  IncomeCategoryWithRelations,
  IncomeWithRelations,
  SaleWithRelations,
} from "@/types";

// For filter options
import { useCustomers } from "@/hooks/useCustomers";
import { useSales } from "@/hooks/useSales";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { paymentMethodEnum } from "@/drizzle/schema";
import { incomeColumns } from "../table/columns/incomeColumns";
import IncomeDialog from "./IncomeDialog";

interface IncomeListTableProps {
  initialData: { documents: IncomeWithRelations[]; total: number };
}

const IncomeListTable: React.FC<IncomeListTableProps> = ({ initialData }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<IncomeWithRelations>(
    {} as IncomeWithRelations
  );

  const {
    incomeRecords,
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
  } = useIncome({ initialData });

  // Data for filter dropdowns
  const { customers: allCustomers } = useCustomers({ getAllCustomers: true });
  const { sales: allSales } = useSales({ getAllSales: true });
  const { incomeCategories: allIncomeCategories } = useIncomeCategories({
    getAllCategories: true,
  });
  const { accounts: allAccounts } = useAccounts({ getAllAccounts: true });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search to URL/Tanstack Query
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = useCallback((rowData: IncomeWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  }, []);

  const incomeFiltersConfig = useMemo(
    () => ({
      customerId: {
        type: "select" as const,
        label: "Customer",
        options: allCustomers.map((cust: Customer) => ({
          label: cust.name,
          value: cust.id,
        })),
      },
      saleId: {
        type: "select" as const,
        label: "Linked Sale",
        options: allSales.map((sale: SaleWithRelations) => ({
          label: `${sale.sale.invoiceNumber} (${sale.customer?.name || "N/A"})`,
          value: sale.sale.id,
        })),
      },
      incomeCategoryId: {
        type: "select" as const,
        label: "Category",
        options: allIncomeCategories.map(
          (cat: IncomeCategoryWithRelations) => ({
            label: cat.incomeCategory.name,
            value: cat.incomeCategory.id,
          })
        ),
      },
      receivingAccountId: {
        type: "select" as const,
        label: "Receiving Account",
        options: allAccounts.map((acc: AccountWithRelations) => ({
          label: `${acc.account.name} (${acc.account.accountNumber || "N/A"})`,
          value: acc.account.id,
        })),
      },
      paymentMethod: {
        type: "select" as const,
        label: "Payment Method",
        options: Object.values(paymentMethodEnum.enumValues).map((method) => ({
          label: method.replace(/_/g, " "),
          value: method,
        })),
      },
      paymentDate: {
        type: "date" as const,
        label: "Payment Date",
      },
      amount: {
        type: "number" as const,
        label: "Amount",
      },
    }),
    [allCustomers, allSales, allIncomeCategories, allAccounts]
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
    (newFilters: IncomeFilters) => {
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
        columns={incomeColumns}
        data={incomeRecords || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={incomeFiltersConfig}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <IncomeDialog
        mode={"view"}
        open={openDialog && !!selectedRow.payment?.id}
        onOpenChange={closeDialog}
        income={selectedRow}
      />
    </>
  );
};

export default IncomeListTable;
