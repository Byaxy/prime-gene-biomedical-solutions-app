"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuotationActions from "@/components/quotations/QuotationActions";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { QuotationWithRelations } from "@/types";

export const quotationsColumns: ColumnDef<QuotationWithRelations>[] = [
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
    accessorKey: "quotation.quotationDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Quotation Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(quotation.quotation.quotationDate).dateTime}
        </p>
      );
    },
  },
  {
    id: "quotation.quotationNumber",
    accessorKey: "quotation.quotationNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Quotation Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <p className="text-14-medium ">
          {quotation.quotation.quotationNumber || "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "product.quantity",
    header: "Quantity",
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <p className="text-14-medium ">
          {quotation.products.reduce(
            (total, product) => total + product.quantity,
            0
          ) || 0}
        </p>
      );
    },
  },
  {
    accessorKey: "quotation.totalAmount",
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
      const quotation = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={quotation.quotation.totalAmount} />
        </p>
      );
    },
  },
  {
    accessorKey: "quotation.status",
    header: "Status",
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              quotation.quotation.status === "pending" &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              quotation.quotation.status === "completed" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              quotation.quotation.status === "cancelled" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {quotation.quotation.status}
          </span>
        </p>
      );
    },
  },

  {
    id: "quotation.rfqNumber",
    accessorKey: "quotation.rfqNumber",
    header: "RFQ No.",
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <p className="text-14-medium ">
          {quotation.quotation.rfqNumber || "-"}
        </p>
      );
    },
  },

  {
    id: "customer.name",
    accessorKey: "customer.name",
    header: "Customer",
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <p className="text-14-medium ">{quotation.customer.name || "-"}</p>
      );
    },
  },
  {
    accessorKey: "quotation.convertedToSale",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Converted To Sale
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <span
          className={cn(
            "text-14-medium",
            quotation.quotation.convertedToSale &&
              "bg-green-500 text-white px-3 py-1 rounded-xl",
            !quotation.quotation.convertedToSale &&
              "bg-red-600 text-white px-3 py-1 rounded-xl"
          )}
        >
          {quotation.quotation.convertedToSale ? "Yes" : "No"}
        </span>
      );
    },
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <QuotationActions quotation={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
