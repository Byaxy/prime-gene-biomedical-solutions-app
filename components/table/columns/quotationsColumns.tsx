"use client";

import { ColumnDef } from "@tanstack/table-core";
import { Quotation } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuotationActions from "@/components/quotations/QuotationActions";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";

export const quotationsColumns: ColumnDef<Quotation>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "quotationDate",
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
          {formatDateTime(quotation.quotationDate).dateTime}
        </p>
      );
    },
  },
  {
    id: "quotationNumber",
    accessorKey: "quotationNumber",
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
        <p className="text-14-medium ">{quotation.quotationNumber || "-"}</p>
      );
    },
  },
  {
    accessorKey: "quantity",
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
      const quotation = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={quotation.totalAmount} />
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
      const quotation = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={quotation.amountPaid} />
        </p>
      );
    },
  },

  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              quotation.status === "pending" &&
                "text-white bg-orange-500 px-3 py-1 rounded-xl",
              quotation.status === "completed" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              quotation.status === "cancelled" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {quotation.status}
          </span>
        </p>
      );
    },
  },

  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => {
      const quotation = row.original;
      return (
        <p className="text-14-medium ">
          {quotation.customer ? quotation.customer.name : "-"}
        </p>
      );
    },
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <QuotationActions quotation={row.original} />;
    },
  },
];
