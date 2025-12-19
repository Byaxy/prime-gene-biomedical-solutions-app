"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackorderActions from "@/components/backorders/BackorderActions";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { BackorderWithRelations } from "@/types";

export const backorderColumns: ColumnDef<BackorderWithRelations>[] = [
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
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="font-semibold px-0"
      >
        Back-order Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <p className="text-14-medium">
        {formatDateTime(row.original.backorder.createdAt).dateOnly}
      </p>
    ),
  },
  {
    accessorKey: "sale.invoiceNumber",
    header: "Sale Invoice #",
    cell: ({ row }) => (
      <p className="text-14-medium">
        {row.original.saleItem?.sale?.sale.invoiceNumber ?? "-"}
      </p>
    ),
  },
  {
    accessorKey: "customer.name",
    header: "Customer",
    cell: ({ row }) => (
      <p className="text-14-medium">
        {row.original.saleItem?.sale?.customer?.name ?? "-"}
      </p>
    ),
  },
  {
    accessorKey: "product.productID",
    header: "PID",
    cell: ({ row }) => (
      <p className="text-14-medium">{row.original.product?.productID ?? "-"}</p>
    ),
  },
  {
    accessorKey: "product.name",
    header: "Product",
    cell: ({ row }) => (
      <p className="text-14-medium">{row.original.product?.name ?? "-"}</p>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Ordered Qty",
    cell: ({ row }) => (
      <p className="text-14-medium">
        {formatNumber(String(row.original.backorder.originalPendingQuantity))}
      </p>
    ),
  },

  {
    header: "Pending Qty",
    cell: ({ row }) => (
      <p className="text-14-medium">
        {formatNumber(String(row.original.backorder.pendingQuantity))}
      </p>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <BackorderActions backOrder={row.original} />,
    meta: { skipRowClick: true },
  },
];
