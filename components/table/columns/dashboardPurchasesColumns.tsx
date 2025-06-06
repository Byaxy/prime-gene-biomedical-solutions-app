"use client";

import { ColumnDef } from "@tanstack/table-core";
import { Purchase } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";

export const dashboardPurchasesColumns: ColumnDef<Purchase>[] = [
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
    accessorKey: "purchaseDate",
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
      const purchase = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(purchase.purchaseDate).dateTime}
        </p>
      );
    },
  },
  {
    id: "name",
    accessorKey: "purchaseOrderNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Purchase Order Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p className="text-14-medium ">{purchase.purchaseOrderNumber || "-"}</p>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              purchase.status === "pending" &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              purchase.status === "completed" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              purchase.status === "cancelled" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {purchase.status}
          </span>
        </p>
      );
    },
  },
  {
    accessorKey: "amountPaid",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Paid
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={purchase.amountPaid} />
        </p>
      );
    },
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={purchase.totalAmount} />
        </p>
      );
    },
  },
];
