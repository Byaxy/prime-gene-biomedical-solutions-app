"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { IncomeTrackerRecord, PaymentStatus } from "@/types";
import SalePaymentActions from "@/components/income/SalePaymentActions";

export const incomeTrackerColumns: ColumnDef<IncomeTrackerRecord>[] = [
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
    id: "customer.name",
    accessorKey: "customer.name",
    header: "Customer",
    cell: ({ row }) => {
      const record = row.original;
      return <p className="text-14-medium ">{record.customer?.name || "-"}</p>;
    },
  },

  {
    id: "sale.invoiceNumber",
    accessorKey: "sale.invoiceNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Invoice #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const record = row.original;
      return (
        <p className="text-14-medium ">{record.sale.invoiceNumber || "-"}</p>
      );
    },
  },
  {
    id: "sale.saleDate",
    accessorKey: "sale.saleDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Sale Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const record = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(record.sale.saleDate).dateOnly}
        </p>
      );
    },
  },
  {
    id: "sale.dueDate",
    accessorKey: "sale.dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const record = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(record.sale.dueDate).dateOnly}
        </p>
      );
    },
  },
  {
    id: "sale.totalAmount",
    accessorKey: "sale.totalAmount",
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
      const record = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={record.sale.totalAmount} />
        </p>
      );
    },
  },
  {
    id: "sale.amountPaid", // This is the aggregated amount from our process
    accessorKey: "sale.amountPaid",
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
      const record = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={record.totalReceivedOnSale} />
        </p>
      );
    },
  },
  {
    id: "openBalance",
    accessorKey: "openBalance", // Derived client-side
    header: "Open Balance",
    cell: ({ row }) => {
      const record = row.original;
      return (
        <p
          className={cn(
            "text-14-medium font-bold",
            parseFloat(record.openBalance) > 0 && "text-red-600",
            parseFloat(record.openBalance) <= 0 && "text-green-500"
          )}
        >
          <FormatNumber value={parseFloat(record.openBalance)} />
        </p>
      );
    },
  },
  {
    id: "paymentStatus",
    accessorKey: "paymentStatus",
    header: "Payment Status",
    cell: ({ row }) => {
      const record = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize px-3 py-1 rounded-xl text-white",
              record.paymentStatus === PaymentStatus.Pending && "bg-[#f59e0b]", // Orange
              record.paymentStatus === PaymentStatus.Partial && "bg-blue-600",
              record.paymentStatus === PaymentStatus.Paid && "bg-green-500",
              record.paymentStatus === PaymentStatus.Due && "bg-red-600"
            )}
          >
            {record.paymentStatus}
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
      const record = row.original;
      return <p className="text-14-medium ">{record.lastPaymentRef || "-"}</p>;
    },
  },
  {
    id: "isOverdue",
    accessorKey: "isOverdue",
    header: "Is Overdue?",
    cell: ({ row }) => {
      const record = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize px-3 py-1 rounded-xl text-white",
              record.isOverdue ? "bg-red-600" : "bg-green-500"
            )}
          >
            {record.isOverdue ? "Yes" : "No"}
          </span>
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <SalePaymentActions incomeTrackerData={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
