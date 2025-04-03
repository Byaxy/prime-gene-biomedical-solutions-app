"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductActions from "@/components/products/ProductActions";
import { formatNumber } from "@/lib/utils";
import { ProductWithRelations } from "@/types";
import PreviewImage from "@/components/PreviewImage";
import { Checkbox } from "@/components/ui/checkbox";

export const productsColumns: ColumnDef<ProductWithRelations>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        className="hover:bg-white w-4 h-4"
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
    header: "Image",
    cell: ({ row }) => {
      const product = row.original;
      return <PreviewImage imageUrl={product.product.imageUrl ?? ""} />;
    },
  },
  {
    header: "PID",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <>
          <p className="text-14-medium">{product.product.productID}</p>
        </>
      );
    },
  },
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Product Description
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },

    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium ">{product.product.name}</p>;
    },
  },
  {
    accessorKey: "brand",
    header: "Vendor/Brand",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium ">{product.brand.name || "-"}</p>;
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium ">{product.type.name || "-"}</p>;
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium ">{product.category.name || "-"}</p>;
    },
  },
  {
    accessorKey: "quantity",
    header: "Qnty on Hand",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="text-14-medium flex flex-row items-center gap-1">
          {product.product.quantity || 0}
          {product.unit.code || "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "alertQuantity",
    header: "Alert Qnty",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <>
          <p className="text-14-medium">
            {formatNumber(String(product.product.alertQuantity))}
          </p>
        </>
      );
    },
  },
  {
    header: "Tax",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <>
          <p className="text-14-medium">{product.taxRate.taxRate}%</p>
        </>
      );
    },
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <ProductActions product={row.original.product} />;
    },
  },
];
