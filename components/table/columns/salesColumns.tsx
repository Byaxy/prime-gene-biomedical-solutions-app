"use client";

import { ColumnDef } from "@tanstack/table-core";
import { Sale } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import SaleActions from "@/components/sales/SaleActions";
import { formatDateTime } from "@/lib/utils";

export const salesColumns: ColumnDef<Sale>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "saleDate",
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
          {formatDateTime(sale.saleDate).dateTime}
        </p>
      );
    },
  },
  {
    id: "name",
    accessorKey: "invoiceNumber",
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
      return <p className="text-14-medium ">{sale.invoiceNumber || "-"}</p>;
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <p className="text-14-medium ">
          {sale.products.reduce(
            (total, product) => total + product.quantity,
            0
          ) || 0}
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
      const sale = row.original;
      return <p className="text-14-medium ">{sale.totalAmount || "-"}</p>;
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
      const sale = row.original;
      return <p className="text-14-medium ">{sale.amountPaid || 0}</p>;
    },
  },

  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const sale = row.original;
      return <p className="text-14-medium ">{sale.status}</p>;
    },
  },

  {
    accessorKey: "customerId",
    header: "Customer",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <p className="text-14-medium ">
          {sale.customerId ? sale.customerId.name : "-"}
        </p>
      );
    },
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <SaleActions sale={row.original} />;
    },
  },
];
