"use client";

import { ColumnDef } from "@tanstack/table-core";
import { Sale } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import SaleActions from "@/components/sales/SaleActions";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";

export const salesColumns: ColumnDef<Sale>[] = [
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
    id: "invoiceNumber",
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
      return (
        <p className="text-14-medium ">
          <FormatNumber value={sale.totalAmount} />
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
      const sale = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={sale.amountPaid} />
        </p>
      );
    },
  },

  {
    accessorKey: "status",
    header: "Sale Status",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              sale.status === "pending" &&
                "text-white bg-orange-500 px-3 py-1 rounded-xl",
              sale.status === "completed" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              sale.status === "cancelled" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {sale.status}
          </span>
        </p>
      );
    },
  },

  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <p className="text-14-medium ">
          {sale.customer ? sale.customer.name : "-"}
        </p>
      );
    },
  },

  {
    accessorKey: "deliveryStatus",
    header: "Delivery Status",
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              purchase.deliveryStatus === "pending" &&
                "text-white bg-orange-500 px-3 py-1 rounded-xl",
              purchase.deliveryStatus === "in-progress" &&
                "bg-blue-600 text-white px-3 py-1 rounded-xl text-nowrap",
              purchase.deliveryStatus === "delivered" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              purchase.deliveryStatus === "cancelled" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {purchase.deliveryStatus ?? "-"}
          </span>
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
