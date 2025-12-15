"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
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
          Reference No.
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
    header: "Expense Category",
    cell: ({ row }) => {
      const expense = row.original;

      return (
        <div className="text-14-medium flex flex-col gap-1">
          {expense.items.length > 0
            ? expense.items.map((item) => (
                <span key={item.expenseItem.id}>{item.category.name}</span>
              ))
            : "-"}
        </div>
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
          Total Amount
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
    header: "Payee",
    cell: ({ row }) => {
      const expense = row.original;
      return (
        <div className="text-14-medium flex flex-col gap-1">
          {expense.items.length > 0
            ? expense.items.map((item) => (
                <span key={item.expenseItem.id}>{item.expenseItem.payee}</span>
              ))
            : "-"}
        </div>
      );
    },
  },

  {
    header: "Description/Purpose",
    cell: ({ row }) => {
      const expense = row.original;
      return (
        <div className="text-14-medium flex flex-col gap-1">
          {expense.items.length > 0
            ? expense.items.map((item) => (
                <span key={item.expenseItem.id}>{item.expenseItem.title}</span>
              ))
            : "-"}
        </div>
      );
    },
  },

  {
    accessorKey: "payingAccount.name",
    header: "Paying Account",
    cell: ({ row }) => {
      const expense = row.original;
      return (
        <div className="text-14-medium flex flex-col gap-1">
          {expense.items.length > 0
            ? expense.items.map((item) => (
                <span key={item.expenseItem.id}>{item.payingAccount.name}</span>
              ))
            : "-"}
        </div>
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
