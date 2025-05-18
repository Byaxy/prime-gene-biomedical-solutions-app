"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { InventoryStockWithRelations } from "@/types";
import FormatNumber from "@/components/FormatNumber";

export const inventoryStockColumns: ColumnDef<InventoryStockWithRelations>[] = [
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
    id: "product.productID",
    accessorKey: "product.productID",
    header: "PID",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return (
        <p className="text-14-medium ">{inventoryStock.product.productID}</p>
      );
    },
  },
  {
    id: "product.name",
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
    id: "inventory.lotNumber",
    accessorKey: "inventory.lotNumber",
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
        <span
          className={cn(
            "text-14-medium",
            inventoryStock.inventory.quantity <= 0 &&
              "bg-red-600 text-white px-3 py-1 rounded-xl",
            inventoryStock.inventory.quantity > 0 &&
              "bg-green-500 text-white px-3 py-1 rounded-xl"
          )}
        >
          {inventoryStock.inventory.quantity}
        </span>
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
    id: "store.name",
    accessorKey: "store.name",
    header: "Store",
    cell: ({ row }) => {
      const inventoryStock = row.original;
      return <p className="text-14-medium ">{inventoryStock.store.name}</p>;
    },
  },
];
