"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductActions from "@/components/products/ProductActions";
import { formatNumber } from "@/lib/utils";
import { ProductWithRelations } from "@/types";
import PreviewImage from "@/components/PreviewImage";
import { Checkbox } from "@/components/ui/checkbox";
import FormatNumber from "@/components/FormatNumber";

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
    id: "product.productID",
    header: "PID",
    accessorKey: "product.productID",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium">{product.product.productID}</p>;
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
    accessorKey: "product.costPrice",
    header: "Cost Price",
    cell: ({ row }) => {
      const product = row.original;
      return <FormatNumber value={product.product.sellingPrice} />;
    },
  },
  {
    accessorKey: "product.sellingPrice",
    header: "Selling Price",
    cell: ({ row }) => {
      const product = row.original;
      return <FormatNumber value={product.product.sellingPrice} />;
    },
  },
  {
    id: "brand.name",
    accessorKey: "brand.name",
    header: "Vendor/Brand",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium ">{product.brand.name || "-"}</p>;
    },
  },
  {
    id: "type.name",
    accessorKey: "type.name",
    header: "Type",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium ">{product.type.name || "-"}</p>;
    },
  },
  {
    id: "category.name",
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium ">{product.category.name || "-"}</p>;
    },
  },
  {
    accessorKey: "product.quantity",
    header: "Qnty on Hand",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div
          className={`text-14-medium flex flex-row items-center justify-center gap-1 px-1.5 py-2 text-white font-bold rounded-md ${
            product.product.quantity <= product.product.alertQuantity
              ? "bg-red-600"
              : product.product.quantity <= product.product.maxAlertQuantity
              ? "bg-yellow-500"
              : "bg-green-500"
          }`}
        >
          <span>{product.product.quantity || 0}</span>
          <span>{product.unit.code || "-"}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "product.alertQuantity",
    header: "Reorder Level",
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
    accessorKey: "taxRate.taxRate",
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
      return <ProductActions product={row.original} />;
    },
  },
];
