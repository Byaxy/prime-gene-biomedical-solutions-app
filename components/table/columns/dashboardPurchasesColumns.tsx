"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { PurchaseStatus, PurchaseWithRelations } from "@/types";

export const dashboardPurchasesColumns: ColumnDef<PurchaseWithRelations>[] = [
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
      const purchase = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(purchase.purchase.purchaseDate).dateTime}
        </p>
      );
    },
  },
  {
    id: "purchase.purchaseOrderNumber",
    accessorKey: "purchase.purchaseOrderNumber",
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
        <p className="text-14-medium ">
          {purchase.purchase.purchaseOrderNumber || "-"}
        </p>
      );
    },
  },
  {
    id: "vendor.name",
    accessorKey: "vendor.name",
    header: "Vendor",
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p className="text-14-medium ">
          {purchase.vendor ? purchase.vendor.name : "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "purchase.status",
    header: "Status",
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              purchase.purchase.status === PurchaseStatus.Pending &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              purchase.purchase.status === PurchaseStatus.Completed &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              purchase.purchase.status === PurchaseStatus.Cancelled &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {purchase.purchase.status}
          </span>
        </p>
      );
    },
  },
  {
    accessorKey: "purchase.totalAmount",
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
          <FormatNumber value={purchase.purchase.totalAmount} />
        </p>
      );
    },
  },
];
