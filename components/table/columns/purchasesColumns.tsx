"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import PurchaseActions from "@/components/purchases/PurchaseActions";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import {
  PaymentStatus,
  PurchaseStatus,
  PurchaseWithRelations,
  ShippingStatus,
} from "@/types";

export const purchasesColumns: ColumnDef<PurchaseWithRelations>[] = [
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
    id: "purchase.purchaseNumber",
    accessorKey: "purchase.purchaseNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Purchase Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p className="text-14-medium ">
          {purchase.purchase.purchaseNumber || "-"}
        </p>
      );
    },
  },
  {
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
          <FormatNumber value={purchase.purchase.totalAmount} />
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
    accessorKey: "purchase.paymentStatus",
    header: "Payment Status",
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              purchase.purchase.paymentStatus === PaymentStatus.Pending &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              purchase.purchase.paymentStatus === PaymentStatus.Partial &&
                "bg-blue-600 text-white px-3 py-1 rounded-xl",
              purchase.purchase.paymentStatus === PaymentStatus.Paid &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              purchase.purchase.paymentStatus === PaymentStatus.Due &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {purchase.purchase.paymentStatus}
          </span>
        </p>
      );
    },
  },
  {
    accessorKey: "purchase.shippingStatus",
    header: "Shipping Status",
    cell: ({ row }) => {
      const purchase = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              purchase.purchase.shippingStatus === ShippingStatus.Shipped &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              purchase.purchase.shippingStatus === ShippingStatus.Received &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              purchase.purchase.shippingStatus ===
                ShippingStatus["Not Shipped"] &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {purchase.purchase.shippingStatus}
          </span>
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
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <PurchaseActions purchase={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
