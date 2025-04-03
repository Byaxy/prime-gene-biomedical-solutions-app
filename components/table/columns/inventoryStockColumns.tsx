"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { InventoryStockWithRelations } from "@/types";
import FormatNumber from "@/components/FormatNumber";

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
      return <FormatNumber value={inventoryStock.inventory.costPrice} />;
    },
  },
  {
    header: "Selling Price",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return <FormatNumber value={inventoryStock.inventory.sellingPrice} />;
    },
  },
  {
    header: "Manufacture Date",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return (
        <p className="text-14-medium ">
          {inventoryStock.inventory?.manufactureDate
            ? formatDateTime(inventoryStock.inventory.manufactureDate).dateOnly
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
            ? formatDateTime(inventoryStock.inventory.expiryDate).dateOnly
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
