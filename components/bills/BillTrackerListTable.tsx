/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/table/DataTable";
import { BillTrackerFilters } from "@/lib/validation";
import { useBillPayments } from "@/hooks/useBillPayments";
import { BillTrackerData, Vendor } from "@/types";
import { billTrackerColumns } from "@/components/table/columns/billTrackerColumns";
import BillPaymentDialog from "./BillPaymentDialog";
import { PaymentStatus } from "@/types"; // From your types

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import FormatNumber from "../FormatNumber";
import { TagIcon, DollarSign, Clock } from "lucide-react"; // Icons for summary cards

interface BillTrackerListTableProps {
  initialData: { documents: BillTrackerData[]; total: number };
  allVendors: Vendor[]; // Passed from server for filter dropdown
}

const BillTrackerListTable: React.FC<BillTrackerListTableProps> = ({
  initialData,
  allVendors,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BillTrackerData>(
    {} as BillTrackerData
  );
  // State to determine dialog mode (view or delete for a specific bill payment)
  const [dialogMode, setDialogMode] = useState<"view" | "delete">("view");

  const {
    billPayments,
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
  } = useBillPayments({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search to URL/Tanstack Query
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  // --- Summary Card Calculations ---
  const {
    unbilledAmount,
    unbilledCount,
    unpaidAmount,
    unpaidCount,
    overdueAmount,
    overdueCount,
    paidLast30DaysAmount,
    paidLast30DaysCount,
    //totalBillAmount,
    //totalBillCount,
  } = useMemo(() => {
    if (!billPayments || billPayments.length === 0) {
      return {
        unbilledAmount: 0,
        unbilledCount: 0,
        unpaidAmount: 0,
        unpaidCount: 0,
        overdueAmount: 0,
        overdueCount: 0,
        paidLast30DaysAmount: 0,
        paidLast30DaysCount: 0,
        totalBillAmount: 0,
        totalBillCount: 0,
      };
    }

    let unbilledA = 0;
    let unbilledC = 0;
    let unpaidA = 0;
    let unpaidC = 0;
    let overdueA = 0;
    let overdueC = 0;
    let paidLast30DaysA = 0;
    let paidLast30DaysC = 0;
    let totalBillA = 0;
    let totalBillC = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    billPayments.forEach((bill: BillTrackerData) => {
      const totalAmount = parseFloat(bill.purchase.totalAmount as any) || 0;
      const amountPaid = parseFloat(bill.purchase.amountPaid as any) || 0;
      const openBalance = totalAmount - amountPaid;
      const paymentStatus = bill.purchase.paymentStatus;
      const purchaseDate = bill.purchase.purchaseDate
        ? new Date(bill.purchase.purchaseDate)
        : null;

      // Total Bills (all purchases that have been received/completed)
      if (bill.purchase.status === "completed") {
        totalBillA += totalAmount;
        totalBillC += 1;
      }

      // Unbilled (Purchase Orders not yet received - status is 'pending')
      if (bill.purchase.status === "pending") {
        unbilledA += totalAmount;
        unbilledC += 1;
      }

      // Unpaid Bills (Open Bills - status completed but payment pending or partial)
      if (
        bill.purchase.status === "completed" &&
        (paymentStatus === "pending" || paymentStatus === "partial")
      ) {
        unpaidA += openBalance;
        unpaidC += 1;
      }

      // Overdue Bills (payment status is 'due')
      if (paymentStatus === "due") {
        overdueA += openBalance;
        overdueC += 1;
      }

      // Paid in Last 30 Days
      // Note: This requires checking when the bill was actually paid
      // If you have a separate field for payment date, use that
      // For now, using purchase date as proxy for paid status
      if (
        paymentStatus === "paid" &&
        purchaseDate &&
        purchaseDate >= thirtyDaysAgo
      ) {
        paidLast30DaysA += totalAmount;
        paidLast30DaysC += 1;
      }
    });

    return {
      unbilledAmount: unbilledA,
      unbilledCount: unbilledC,
      unpaidAmount: unpaidA,
      unpaidCount: unpaidC,
      overdueAmount: overdueA,
      overdueCount: overdueC,
      paidLast30DaysAmount: paidLast30DaysA,
      paidLast30DaysCount: paidLast30DaysC,
      totalBillAmount: totalBillA,
      totalBillCount: totalBillC,
    };
  }, [billPayments]);

  const handleRowClick = useCallback((rowData: BillTrackerData) => {
    setSelectedRow(rowData);
    setDialogMode("view");
    setOpenDialog(true);
  }, []);

  const billTrackerFiltersConfig = useMemo(
    () => ({
      vendorId: {
        type: "select" as const,
        label: "Vendor",
        options: allVendors.map((vendor) => ({
          label: vendor.name,
          value: vendor.id,
        })),
      },
      type: {
        type: "select" as const,
        label: "Type",
        options: [
          { label: "All", value: "all" },
          { label: "Purchase Orders", value: "purchase_orders" }, // Requires getBillTrackerData to provide this context
          { label: "Open Bills", value: "open_bills" },
          { label: "Due Bills", value: "due_bills" },
          { label: "Paid Bills", value: "paid_bill" },
        ],
      },
      status: {
        type: "select" as const,
        label: "Payment Status",
        options: [
          { label: "All", value: "all" },
          ...Object.values(PaymentStatus).map((item) => ({
            label: item.replace(/_/g, " "),
            value: item,
          })),
        ],
      },
      dateRange: {
        type: "select" as const,
        label: "Date",
        options: [
          { label: "All", value: "all" },
          { label: "Today", value: "today" },
          { label: "Yesterday", value: "yesterday" },
          { label: "One Week", value: "one_week" },
          { label: "Two Weeks", value: "two_weeks" },
          { label: "This Month", value: "this_month" },
          { label: "Next One Week", value: "next_one_week" },
          { label: "Next Two Weeks", value: "next_two_weeks" },
          { label: "Next One Month", value: "next_one_month" },
          { label: "Next One Quarter", value: "next_one_quarter" },
        ],
      },
      specificDate: {
        type: "date" as const,
        label: "Specific Date",
      },
    }),
    [allVendors]
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
    (newFilters: Record<string, any>) => {
      setFilters(newFilters as BillTrackerFilters);
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
      {/* --- Bill Tracker Summary Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unbilled Purchases
            </CardTitle>
            <TagIcon className="h-6 w-6 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              <FormatNumber value={unbilledAmount} />
            </div>
            <p className="text-xs ">
              {unbilledCount} Purchase{" "}
              {unbilledCount === 1 ? "Order" : "Orders"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Bills</CardTitle>
            <DollarSign className="h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              <FormatNumber value={unpaidAmount} />
            </div>
            <p className="text-xs">
              {unpaidCount} Open {unpaidCount === 1 ? "Bill" : "Bills"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Bills</CardTitle>
            <Clock className="h-6 w-6 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <FormatNumber value={overdueAmount} />
            </div>
            <p className="text-xs text-red-600">
              {overdueCount} Overdue {overdueCount === 1 ? "Bill" : "Bills"}
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
              <FormatNumber value={paidLast30DaysAmount} />
            </div>
            <p className="text-xs">
              {paidLast30DaysCount}{" "}
              {paidLast30DaysCount === 1 ? "Bill" : "Bills"} Paid
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={billTrackerColumns}
        data={billPayments || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={billTrackerFiltersConfig}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <BillPaymentDialog
        mode={dialogMode}
        open={openDialog && !!selectedRow.purchase?.id}
        onOpenChange={closeDialog}
        billTrackerData={selectedRow} // Pass BillTrackerData to dialog for context
      />
    </>
  );
};

export default BillTrackerListTable;
