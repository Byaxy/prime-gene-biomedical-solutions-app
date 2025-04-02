"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductActions from "@/components/products/ProductActions";
import { formatNumber } from "@/lib/utils";
import { ProductWithRelations } from "@/types";
import PreviewImage from "@/components/PreviewImage";

export const productsColumns: ColumnDef<ProductWithRelations>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.index + 1}</p>;
    },
  },
  {
    header: "Image",
    cell: ({ row }) => {
      const product = row.original;
      return <PreviewImage imageUrl={product.product.imageUrl ?? ""} />;
    },
  },
  {
    header: "Product ID",
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
          Name
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
    header: "Brand",
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
    header: "Quantity At Hand",
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
    header: "Alert Quantity",
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
