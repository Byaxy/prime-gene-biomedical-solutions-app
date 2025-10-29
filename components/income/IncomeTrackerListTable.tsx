/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import {
  IncomeTrackerRecord,
  Customer,
  PaymentMethod,
  SaleWithRelations,
  GetIncomeTrackerDataResponse,
  DateRange,
} from "@/types"; // Import your types
import { useIncomeTracker } from "@/hooks/useIncomeTracker"; // This hook will be created
import { incomeTrackerColumns } from "@/components/table/columns/incomeTrackerColumns"; // This will be created
import SalePaymentDialog from "./SalePaymentDialog"; // This will be created

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import FormatNumber from "../FormatNumber";
import { TagIcon, DollarSign, Clock } from "lucide-react"; // Icons for summary cards
import { IncomeTrackerFilters } from "@/lib/validation";

interface IncomeTrackerListTableProps {
  initialData: GetIncomeTrackerDataResponse;
  allCustomers: Customer[];
  allSales: SaleWithRelations[];
}

const IncomeTrackerListTable: React.FC<IncomeTrackerListTableProps> = ({
  initialData,
  allCustomers,
  allSales,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<IncomeTrackerRecord>(
    {} as IncomeTrackerRecord
  );
  // State to determine dialog mode (view or delete for a specific sale payment)
  const [dialogMode, setDialogMode] = useState<"view" | "delete">("view");

  const {
    incomeTrackerRecords,
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
    summary,
  } = useIncomeTracker({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search to URL/Tanstack Query
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  // Handle row click to open dialog
  const handleRowClick = useCallback((rowData: IncomeTrackerRecord) => {
    setSelectedRow(rowData);
    setDialogMode("view");
    setOpenDialog(true);
  }, []);

  // Configuration for dynamic filters
  const incomeTrackerFiltersConfig = useMemo(
    () => ({
      customerId: {
        type: "select" as const,
        label: "Customer",
        options: allCustomers.map((customer) => ({
          label: customer.name,
          value: customer.id,
        })),
      },
      saleId: {
        type: "select" as const,
        label: "Sale",
        options: allSales.map((record) => ({
          label: record.sale.invoiceNumber,
          value: record.sale.id,
        })),
      },
      paymentMethod: {
        type: "select" as const,
        label: "Payment Method",
        options: [
          { label: "All", value: "all" },
          ...Object.values(PaymentMethod).map((item) => ({
            label: item.replace(/_/g, " "),
            value: item,
          })),
        ],
      },
      status: {
        type: "select" as const,
        label: "Payment Status",
        options: [
          { label: "All", value: "all" },
          { label: "Open", value: "open" },
          { label: "Overdue", value: "overdue" },
          { label: "Paid", value: "paid" },
        ],
      },
      amount: {
        type: "number" as const,
        label: "Amount",
      },

      dateRange: {
        type: "select" as const,
        label: "Sale Date Range",
        options: Object.values(DateRange).map((item) => ({
          label: item.replace(/_/g, " "),
          value: item,
        })),
      },
      specificDate: {
        type: "date" as const,
        label: "Sale Date",
      },
    }),
    [allCustomers, allSales]
  );

  // Event handlers for DataTable
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
    (newFilters: Record<string, any>) => {
      setFilters(newFilters as IncomeTrackerFilters);
    },
    [setFilters]
  );

  // Close dialog handler
  const closeDialog = useCallback(() => {
    setOpenDialog(false);
    setTimeout(() => {
      // Restore pointer events if necessary for any overlay issues
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  }, []);

  return (
    <>
      {/* --- Income Tracker Summary Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unbilled</CardTitle>
            <TagIcon className="h-6 w-6 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              <FormatNumber value={parseFloat(summary.unbilled.amount)} />
            </div>
            <p className="text-xs ">
              {summary.unbilled.count} Quotation
              {summary.unbilled.count === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <DollarSign className="h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              <FormatNumber value={parseFloat(summary.unpaid.amount)} />
            </div>
            <p className="text-xs">
              {summary.unpaid.count} Open{" "}
              {summary.unpaid.count === 1 ? "Sale" : "Sales"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Sales</CardTitle>
            <Clock className="h-6 w-6 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <FormatNumber value={parseFloat(summary.overdue.amount)} />
            </div>
            <p className="text-xs text-red-600">
              {summary.overdue.count} Overdue{" "}
              {summary.overdue.count === 1 ? "Sale" : "Sales"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Paid in Last 30 Days
            </CardTitle>
            <DollarSign className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              <FormatNumber value={parseFloat(summary.paidLast30Days.amount)} />
            </div>
            <p className="text-xs">
              {summary.paidLast30Days.count}{" "}
              {summary.paidLast30Days.count === 1 ? "Sale" : "Sales"} Paid
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={incomeTrackerColumns}
        data={incomeTrackerRecords || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={incomeTrackerFiltersConfig}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <SalePaymentDialog
        mode={dialogMode}
        open={openDialog && !!selectedRow.sale?.id}
        onOpenChange={closeDialog}
        incomeTrackerData={selectedRow}
      />
    </>
  );
};

export default IncomeTrackerListTable;
