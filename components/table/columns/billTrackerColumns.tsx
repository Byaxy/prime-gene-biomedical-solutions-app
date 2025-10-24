"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { BillTrackerData } from "@/types"; // Your BillTrackerData type
import BillPaymentActions from "@/components/bills/BillPaymentActions";

export const billTrackerColumns: ColumnDef<BillTrackerData>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row, table }) => {
      const pagination = table.getState().pagination;
      const globalIndex =
        pagination.pageIndex * pagination.pageSize + row.index + 1;
      return <span className="text-sm text-dark-600">{globalIndex}</span>;
    },
    enableSorting: false,
  },
  {
    id: "purchase.purchaseDate",
    accessorKey: "purchase.purchaseDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Purchase Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const bill = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(bill.purchase.purchaseDate).dateOnly}
        </p>
      );
    },
  },
  {
    id: "vendor.name",
    accessorKey: "vendor.name",
    header: "Vendor",
    cell: ({ row }) => {
      const bill = row.original;
      return <p className="text-14-medium ">{bill.vendor?.name || "-"}</p>;
    },
  },
  {
    id: "purchase.purchaseNumber",
    accessorKey: "purchase.purchaseNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Purchase #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const bill = row.original;
      return (
        <p className="text-14-medium ">{bill.purchase.purchaseNumber || "-"}</p>
      );
    },
  },
  {
    id: "purchase.vendorInvoiceNumber",
    accessorKey: "purchase.vendorInvoiceNumber",
    header: "Vendor Invoice #",
    cell: ({ row }) => {
      const bill = row.original;
      return (
        <p className="text-14-medium ">
          {bill.purchase.vendorInvoiceNumber || "-"}
        </p>
      );
    },
  },
  {
    id: "purchase.totalAmount",
    accessorKey: "purchase.totalAmount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0 "
        >
          Total Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const bill = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={bill.purchase.totalAmount} />
        </p>
      );
    },
  },
  {
    id: "purchase.amountPaid",
    accessorKey: "purchase.amountPaid",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0 "
        >
          Amount Paid
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const bill = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={bill.purchase.amountPaid} />
        </p>
      );
    },
  },
  {
    id: "openBalance",
    accessorKey: "openBalance",
    header: "Open Balance",
    cell: ({ row }) => {
      const bill = row.original;
      const openBalance = bill.purchase.totalAmount - bill.purchase.amountPaid;
      return (
        <p
          className={cn(
            "text-14-medium  font-bold text-red-600",
            openBalance === 0 && "text-green-500"
          )}
        >
          <FormatNumber value={openBalance} />
        </p>
      );
    },
  },
  {
    id: "paymentStatus",
    accessorKey: "paymentStatus", // Derived client-side in hook
    header: "Payment Status",
    cell: ({ row }) => {
      const bill = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize px-3 py-1 rounded-xl text-white",
              bill.paymentStatus === "pending" && "bg-[#f59e0b]",
              bill.paymentStatus === "partial" && "bg-blue-600",
              bill.paymentStatus === "paid" && "bg-green-500",
              bill.paymentStatus === "due" && "bg-red-600"
            )}
          >
            {bill.paymentStatus}
          </span>
        </p>
      );
    },
  },
  {
    id: "lastPaymentRef",
    accessorKey: "lastPaymentRef", // Aggregated server-side
    header: "Last Payment Ref",
    cell: ({ row }) => {
      const bill = row.original;
      return <p className="text-14-medium ">{bill.lastPaymentRef || "-"}</p>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      // Need to pass the specific purchase (bill) data
      return <BillPaymentActions billTrackerData={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
