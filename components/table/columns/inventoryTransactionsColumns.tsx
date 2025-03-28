"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { InventoryTransactionWithRelations } from "@/types";

export const inventoryTransactionsColumns: ColumnDef<InventoryTransactionWithRelations>[] =
  [
    {
      header: "Date",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium ">
            {
              formatDateTime(inventoryStock.transaction.transactionDate)
                .dateTime
            }
          </p>
        );
      },
    },
    {
      id: "name",
      accessorKey: "product.name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Product Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },

      cell: ({ row }) => {
        const inventoryStock = row.original;
        return <p className="text-14-medium ">{inventoryStock.product.name}</p>;
      },
    },
    {
      header: "Lot Number",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium ">
            {inventoryStock.inventory.lotNumber || "N/A"}
          </p>
        );
      },
    },
    {
      header: "Store",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium ">
            {inventoryStock.store.name} - {inventoryStock.store.location}
          </p>
        );
      },
    },
    {
      header: "User",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return <p className="text-14-medium ">{inventoryStock.user.name}</p>;
      },
    },
    {
      header: "Transaction Type",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium ">
            {formatNumber(String(inventoryStock.transaction.transactionType))}
          </p>
        );
      },
    },
    {
      header: "Quantity Before",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium ">
            {inventoryStock.transaction.quantityBefore}
          </p>
        );
      },
    },
    {
      header: "Quantity After",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium ">
            {inventoryStock.transaction.quantityAfter}
          </p>
        );
      },
    },
    {
      header: "Notes",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium ">
            {`${inventoryStock.transaction.notes?.substring(0, 150)}...`}
          </p>
        );
      },
    },
  ];
