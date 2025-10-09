import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormatNumber from "@/components/FormatNumber";
import { AccountWithRelations } from "@/types";
import AccountActions from "@/components/accounts/AccountActions";

export const accountsColumns: ColumnDef<AccountWithRelations>[] = [
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
    id: "account.name",
    accessorKey: "account.name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Account Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const account = row.original;
      return <p className="text-14-medium ">{account.account.name}</p>;
    },
  },
  {
    id: "account.accountNumber",
    accessorKey: "account.accountNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Account Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const account = row.original;
      return (
        <p className="text-14-medium ">
          {account.account.accountNumber || "-"}
        </p>
      );
    },
  },
  {
    id: "account.accountType",
    accessorKey: "account.accountType",
    header: "Type",
    cell: ({ row }) => {
      const account = row.original;
      return (
        <p className="text-14-medium capitalize">
          {account.account.accountType.replace(/_/g, " ")}
        </p>
      );
    },
  },
  {
    id: "account.currency",
    accessorKey: "account.currency",
    header: "Currency",
    cell: ({ row }) => {
      const account = row.original;
      return <p className="text-14-medium ">{account.account.currency}</p>;
    },
  },
  {
    id: "account.currentBalance",
    accessorKey: "account.currentBalance",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-14-medium px-0"
        >
          Current Balance
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const account = row.original;
      return (
        <p className="text-14-semibold">
          <FormatNumber value={account.account.currentBalance} />
        </p>
      );
    },
  },
  {
    id: "chartOfAccount.accountName",
    accessorKey: "chartOfAccount.accountName",
    header: "Linked CoA",
    cell: ({ row }) => {
      const account = row.original;
      return (
        <p className="text-14-medium ">
          {account.chartOfAccount?.accountName || "-"}
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <AccountActions account={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
