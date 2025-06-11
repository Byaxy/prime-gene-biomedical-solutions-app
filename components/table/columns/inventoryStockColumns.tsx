"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { GroupedInventoryStock, InventoryStockWithRelations } from "@/types";
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

export const groupedInventoryStockColumns: ColumnDef<GroupedInventoryStock>[] =
  [
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
      header: "Latest Received Date",
      accessorKey: "latestReceivedDate",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium">
            {formatDateTime(inventoryStock.latestReceivedDate).dateOnly}
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
          <p className="text-14-medium">{inventoryStock.product.productID}</p>
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
        return <p className="text-14-medium">{inventoryStock.product.name}</p>;
      },
    },
    {
      header: "Batches",
      accessorKey: "stockBatches.length",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium">{inventoryStock.stockBatches.length}</p>
        );
      },
    },
    {
      header: "Total Qnty",
      accessorKey: "totalQuantity",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <span
            className={cn(
              "text-14-medium px-3 py-1 rounded-xl font-medium",
              inventoryStock.totalQuantity <= 0
                ? "bg-red-600 text-white"
                : "bg-green-500 text-white"
            )}
          >
            {inventoryStock.totalQuantity}
          </span>
        );
      },
    },
    {
      header: "Avg Cost Price",
      accessorKey: "avgCostPrice",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return <FormatNumber value={inventoryStock.avgCostPrice} />;
      },
    },
    {
      header: "Avg Selling Price",
      accessorKey: "avgSellingPrice",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return <FormatNumber value={inventoryStock.avgSellingPrice} />;
      },
    },
    {
      header: "Earliest MFG Date",
      accessorKey: "earliestManufactureDate",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        return (
          <p className="text-14-medium">
            {inventoryStock.earliestManufactureDate
              ? formatDateTime(inventoryStock.earliestManufactureDate).dateOnly
              : "N/A"}
          </p>
        );
      },
    },
    {
      header: "Nearest EXP Date",
      accessorKey: "nearestExpiryDate",
      cell: ({ row }) => {
        const inventoryStock = row.original;
        const isNearExpiry =
          inventoryStock.nearestExpiryDate &&
          new Date(inventoryStock.nearestExpiryDate) <=
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        return (
          <p
            className={cn(
              "text-14-medium",
              isNearExpiry && "text-orange-600 font-semibold"
            )}
          >
            {inventoryStock.nearestExpiryDate
              ? formatDateTime(inventoryStock.nearestExpiryDate).dateOnly
              : "N/A"}
          </p>
        );
      },
    },
  ];
