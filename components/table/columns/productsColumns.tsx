"use client";

import { ColumnDef } from "@tanstack/table-core";
import { Product } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductActions from "@/components/products/ProductActions";

export const productsColumns: ColumnDef<Product>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.index + 1}</p>;
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
      return <p className="text-14-medium ">{product.name}</p>;
    },
  },
  {
    accessorKey: "material",
    header: "Material",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium">{product.materialId.name || "-"}</p>;
    },
  },
  {
    accessorKey: "color",
    header: "Color",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div
          style={{ backgroundColor: product.colorId.code }}
          className="h-5 w-5 rounded-full"
        />
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium">{product.typeId.name || "-"}</p>;
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium">{product.categoryId.name || "-"}</p>;
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity Available",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium">{product.quantity}</p>;
    },
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium">{product.sellingPrice}</p>;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium">{product.description || "-"}</p>;
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
