"use client";

import { ColumnDef } from "@tanstack/table-core";
import { Product } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductActions from "@/components/products/ProductActions";
import FormatNumber from "@/components/FormatNumber";
import Image from "next/image";

export const productsColumns: ColumnDef<Product>[] = [
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
      return (
        <div className="flex">
          <Image
            src={product.imageUrl || "/assets/images/placeholder.jpg"}
            alt={product.name}
            width={200}
            height={50}
            className="h-12 w-24 rounded-md object-cover"
            priority={true}
          />
        </div>
      );
    },
  },
  {
    id: "lotNumber",
    accessorKey: "lotNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Lot Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },

    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium ">{product.lotNumber || "-"}</p>;
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
    accessorKey: "vendor",
    header: "Vendor",
    cell: ({ row }) => {
      const product = row.original;
      return <p className="text-14-medium">{product?.vendor.name || "-"}</p>;
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <p className="text-14-medium">
          {(product?.type && product?.type.name) || "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <p className="text-14-medium">
          {(product?.category && product?.category.name) || "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity Available",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <p className="text-14-medium">
          {product.quantity || 0}
          {(product?.unit && product?.unit.code) || ""}
        </p>
      );
    },
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <>
          <p className="text-14-medium">
            <FormatNumber value={product.sellingPrice} />
          </p>
        </>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <p className="text-14-medium">
          {product.description.substring(0, 20).concat("...") || "-"}
        </p>
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
