"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import SaleActions from "@/components/sales/SaleActions";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { SaleWithRelations } from "@/types";

export const salesColumns: ColumnDef<SaleWithRelations>[] = [
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
          {formatDateTime(sale.sale.saleDate).dateTime}
        </p>
      );
    },
  },
  {
    id: "sale.invoiceNumber",
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
      return (
        <p className="text-14-medium ">{sale.sale.invoiceNumber || "-"}</p>
      );
    },
  },
  {
    id: "customer.name",
    accessorKey: "customer.name",
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
    accessorKey: "status",
    header: "Sale Status",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              sale.sale.status === "pending" &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              sale.sale.status === "completed" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              sale.sale.status === "cancelled" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl",
            )}
          >
            {sale.sale.status}
          </span>
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
          Grand Total
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
          <FormatNumber value={sale.sale.amountPaid} />
        </p>
      );
    },
  },
  {
    header: "Balance",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={sale.sale.totalAmount - sale.sale.amountPaid} />
        </p>
      );
    },
  },
  {
    header: "Payment Status",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              sale.sale.paymentStatus === "pending" &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              sale.sale.paymentStatus === "partial" &&
                "bg-blue-600 text-white px-3 py-1 rounded-xl",
              sale.sale.paymentStatus === "paid" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              sale.sale.paymentStatus === "due" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl",
            )}
          >
            {sale.sale.paymentStatus}
          </span>
        </p>
      );
    },
  },
  {
    header: "Delivery Note?",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <span
          className={cn(
            "text-14-medium",
            sale?.delivery
              ? "bg-green-500 text-white px-3 py-1 rounded-xl"
              : "bg-red-600 text-white px-3 py-1 rounded-xl",
          )}
        >
          {sale?.delivery ? "Yes" : "No"}
        </span>
      );
    },
  },
  {
    header: "Delivery Status",
    cell: ({ row }) => {
      const sale = row.original;

      const productsDelivered = sale.products.reduce(
        (total, product) => total + product.fulfilledQuantity,
        0,
      );
      const totalPdctQnty = sale.products.reduce(
        (total, product) => total + product.quantity,
        0,
      );

      return (
        <p>
          {productsDelivered === 0 && (
            <span className="bg-red-600 text-white px-3 py-1 rounded-xl">
              Pending
            </span>
          )}
          {productsDelivered > 0 && productsDelivered < totalPdctQnty && (
            <span className="text-white bg-[#f59e0b] px-3 py-1 rounded-xl">
              Partially Delivered
            </span>
          )}
          {productsDelivered === totalPdctQnty && (
            <span className="text-white bg-green-500 px-3 py-1 rounded-xl">
              Fully Delivered
            </span>
          )}
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
    meta: {
      skipRowClick: true,
    },
  },
];
