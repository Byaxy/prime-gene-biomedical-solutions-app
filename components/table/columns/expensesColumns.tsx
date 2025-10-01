"use client";

import { ColumnDef } from "@tanstack/table-core";
import { formatDateTime } from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExpenseActions from "@/components/expenses/ExpenseActions";
import FormatNumber from "@/components/FormatNumber";
import { Expense } from "@/types";

export const expensesColumns: ColumnDef<Expense>[] = [
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
    accessorKey: "expenseDate",
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
      const expense = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(expense.expenseDate).dateTime}
        </p>
      );
    },
  },
  {
    id: "title",
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },

    cell: ({ row }) => {
      const expense = row.original;
      return <p className="text-14-medium ">{expense.title}</p>;
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const expense = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={expense.amount} />
        </p>
      );
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Payment Method",
    cell: ({ row }) => {
      const expense = row.original;
      return <p className="text-14-medium ">{expense.paymentMethod || "-"}</p>;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const expense = row.original;
      return <p className="text-14-medium ">{expense.description || "-"}</p>;
    },
    meta: {
      skipRowClick: true,
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <ExpenseActions expense={row.original} />;
    },
  },
];
