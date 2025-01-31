"use client";

import { ColumnDef } from "@tanstack/table-core";
import { Purchase } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import PurchaseActions from "@/components/purchases/PurchaseActions";
import { formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";

export const purchasesColumns: ColumnDef<Purchase>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.index + 1}</p>;
    },
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
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p className="text-14-medium ">
          {purchase.products.reduce(
            (total, product) => total + product.quantity,
            0
          ) || "-"}
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const purchase = row.original;
      return <p className="text-14-medium ">{purchase.status}</p>;
    },
  },

  {
    accessorKey: "supplierId",
    header: "Supplier",
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p className="text-14-medium ">
          {purchase.supplierId ? purchase.supplierId.name : "-"}
        </p>
      );
    },
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <PurchaseActions purchase={row.original} />;
    },
  },
];
