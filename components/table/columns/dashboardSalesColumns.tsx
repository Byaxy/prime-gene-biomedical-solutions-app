"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { SaleWithRelations } from "@/types";

export const dashboardSalesColumns: ColumnDef<SaleWithRelations>[] = [
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
      const sale = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(sale.sale.saleDate).dateOnly}
        </p>
      );
    },
  },
  {
    id: "name",
    accessorKey: "sale.invoiceNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Invoice Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const sale = row.original;
      return <p className="text-14-medium">{sale.sale.invoiceNumber || "-"}</p>;
    },
  },
  {
    accessorKey: "sale.status",
    header: "Status",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              sale.sale.status === "pending" &&
                "text-white bg-orange-500 px-3 py-1 rounded-xl",
              sale.sale.status === "completed" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              sale.sale.status === "cancelled" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {sale.sale.status}
          </span>
        </p>
      );
    },
  },
  {
    accessorKey: "sale.amountPaid",
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
      const sale = row.original;
      return (
        <p className="text-14-medium">
          <FormatNumber value={sale.sale.amountPaid} />
        </p>
      );
    },
  },
  {
    accessorKey: "sale.totalAmount",
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
      const sale = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={sale.sale.totalAmount} />
        </p>
      );
    },
  },
];
