"use client";

import { ColumnDef } from "@tanstack/table-core";
import { Purchase } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import PurchaseActions from "@/components/purchases/PurchaseActions";
import { cn, formatDateTime } from "@/lib/utils";
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
    id: "purchaseOrderNumber",
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
    header: "Purchase Status",
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              purchase.status === "pending" &&
                "text-white bg-orange-500 px-3 py-1 rounded-xl",
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
    accessorKey: "vendor",
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
      return <PurchaseActions purchase={row.original} />;
    },
  },
];
