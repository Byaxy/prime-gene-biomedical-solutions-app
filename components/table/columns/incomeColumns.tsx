"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { IncomeWithRelations } from "@/types";
import IncomeActions from "@/components/income/IncomeActions";

export const incomeColumns: ColumnDef<IncomeWithRelations>[] = [
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
    id: "payment.paymentDate",
    accessorKey: "payment.paymentDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const income = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(income.payment.paymentDate).dateOnly}
        </p>
      );
    },
  },
  {
    id: "payment.paymentRefNumber",
    accessorKey: "payment.paymentRefNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Reference
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const income = row.original;
      return (
        <p className="text-14-medium ">
          {income.payment.paymentRefNumber || "-"}
        </p>
      );
    },
  },
  {
    id: "customer.name",
    accessorKey: "customer.name",
    header: "Customer",
    cell: ({ row }) => {
      const income = row.original;
      return <p className="text-14-medium ">{income.customer?.name || "-"}</p>;
    },
  },
  {
    id: "sale.invoiceNumber",
    accessorKey: "sale.invoiceNumber",
    header: "Linked Sale",
    cell: ({ row }) => {
      const income = row.original;
      return (
        <p className="text-14-medium ">{income.sale?.invoiceNumber || "-"}</p>
      );
    },
  },
  {
    id: "incomeCategory.name",
    accessorKey: "incomeCategory.name",
    header: "Category",
    cell: ({ row }) => {
      const income = row.original;
      return (
        <p className="text-14-medium ">{income.incomeCategory?.name || "-"}</p>
      );
    },
  },
  {
    id: "receivingAccount.name",
    accessorKey: "receivingAccount.name",
    header: "Receiving Account",
    cell: ({ row }) => {
      const income = row.original;
      return (
        <p className="text-14-medium ">
          {income.receivingAccount?.name || "-"}
        </p>
      );
    },
  },
  {
    id: "payment.paymentMethod",
    accessorKey: "payment.paymentMethod",
    header: "Method",
    cell: ({ row }) => {
      const income = row.original;
      return (
        <p className="text-14-medium capitalize">
          {income.payment.paymentMethod.replace(/_/g, " ") || "-"}
        </p>
      );
    },
  },
  {
    id: "payment.amountReceived",
    accessorKey: "payment.amountReceived",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0 text-right"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const income = row.original;
      return (
        <p className="text-14-medium text-right">
          <FormatNumber value={income.payment.amountReceived} />
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <IncomeActions income={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
