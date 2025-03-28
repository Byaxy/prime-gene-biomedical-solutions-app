"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatNumber } from "@/lib/utils";

import { InventoryStockWithRelations } from "@/types";

export const inventoryStockColumns: ColumnDef<InventoryStockWithRelations>[] = [
  {
    header: "Date",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(inventoryStock.inventory.receivedDate).dateOnly}
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
        <p className="text-14-medium ">{inventoryStock.inventory.lotNumber}</p>
      );
    },
  },
  {
    header: "Quantity",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return (
        <p className="text-14-medium ">{inventoryStock.inventory.quantity}</p>
      );
    },
  },
  {
    header: "Cost Price",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return (
        <p className="text-14-medium ">
          {formatNumber(String(inventoryStock.inventory.costPrice))}
        </p>
      );
    },
  },
  {
    header: "Selling Price",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return (
        <p className="text-14-medium ">
          {formatNumber(String(inventoryStock.inventory.sellingPrice))}
        </p>
      );
    },
  },
  {
    header: "Manufacture Date",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return (
        <p className="text-14-medium ">
          {inventoryStock.inventory?.manufactureDate
            ? formatDateTime(inventoryStock.inventory.manufactureDate).dateTime
            : "N/A"}
        </p>
      );
    },
  },
  {
    header: "Expiry Date",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return (
        <p className="text-14-medium ">
          {inventoryStock.inventory?.expiryDate
            ? formatDateTime(inventoryStock.inventory.expiryDate).dateTime
            : "N/A"}
        </p>
      );
    },
  },
  {
    header: "Store",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return <p className="text-14-medium ">{inventoryStock.store.name}</p>;
    },
  },
];
