"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { ReceiptWithRelations } from "@/types";
import ReceiptActions from "@/components/receipts/ReceiptActions";

export const receiptColumns: ColumnDef<ReceiptWithRelations>[] = [
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
    id: "receipt.receiptDate",
    accessorKey: "receipt.receiptDate",
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
      const receipt = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(receipt.receipt.receiptDate).dateOnly}
        </p>
      );
    },
  },
  {
    id: "receipt.receiptNumber",
    accessorKey: "receipt.receiptNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Receipt #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const receipt = row.original;
      return (
        <p className="text-14-medium ">
          {receipt.receipt.receiptNumber || "-"}
        </p>
      );
    },
  },
  {
    id: "customer.name",
    accessorKey: "customer.name",
    header: "Customer",
    cell: ({ row }) => {
      const receipt = row.original;
      return <p className="text-14-medium ">{receipt.customer?.name || "-"}</p>;
    },
  },
  {
    id: "receipt.totalAmountReceived",
    accessorKey: "receipt.totalAmountReceived",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Amount Received
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const receipt = row.original;
      return (
        <p className="text-14-medium">
          <FormatNumber value={receipt.receipt.totalAmountReceived} />
        </p>
      );
    },
  },
  {
    id: "receipt.totalBalanceDue",
    accessorKey: "receipt.totalBalanceDue",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Balance Due
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const receipt = row.original;
      return (
        <p
          className={`text-14-medium ${
            receipt.receipt.totalBalanceDue > 0
              ? "text-red-600"
              : "text-green-600"
          }`}
        >
          <FormatNumber value={receipt.receipt.totalBalanceDue} />
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <ReceiptActions receipt={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
