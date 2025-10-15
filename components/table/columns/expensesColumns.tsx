"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { ExpenseWithRelations } from "@/types";
import ExpenseActions from "@/components/expenses/ExpenseActions";

export const expensesColumns: ColumnDef<ExpenseWithRelations>[] = [
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
    id: "expense.expenseDate",
    accessorKey: "expense.expenseDate",
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
          {formatDateTime(expense.expense.expenseDate).dateOnly}
        </p>
      );
    },
  },
  {
    id: "expense.referenceNumber",
    accessorKey: "expense.referenceNumber",
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
      const expense = row.original;
      return (
        <p className="text-14-medium ">
          {expense.expense.referenceNumber || "-"}
        </p>
      );
    },
  },
  {
    id: "expense.title",
    accessorKey: "expense.title",
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
      return <p className="text-14-medium ">{expense.expense.title}</p>;
    },
  },
  {
    id: "expense.payee",
    accessorKey: "expense.payee",
    header: "Payee",
    cell: ({ row }) => {
      const expense = row.original;
      return <p className="text-14-medium ">{expense.expense.payee || "-"}</p>;
    },
  },
  {
    id: "category.name",
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) => {
      const expense = row.original;
      return <p className="text-14-medium ">{expense.category?.name || "-"}</p>;
    },
  },
  {
    id: "payingAccount.name",
    accessorKey: "payingAccount.name",
    header: "Paying Account",
    cell: ({ row }) => {
      const expense = row.original;
      return (
        <p className="text-14-medium ">{expense.payingAccount?.name || "-"}</p>
      );
    },
  },
  {
    id: "expense.amount",
    accessorKey: "expense.amount",
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
        <p className="text-14-medium">
          <FormatNumber value={expense.expense.amount} />
        </p>
      );
    },
  },
  {
    id: "expense.isAccompanyingExpense",
    accessorKey: "expense.isAccompanyingExpense",
    header: "Accompanying?",
    cell: ({ row }) => {
      const expense = row.original;
      return (
        <p className="text-14-medium ">
          <span
            className={cn(
              "px-3 py-1 rounded-xl text-white",
              expense.expense.isAccompanyingExpense
                ? "bg-green-500"
                : "bg-red-600"
            )}
          >
            {expense.expense.isAccompanyingExpense ? "Yes" : "No"}
          </span>
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <ExpenseActions expense={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
