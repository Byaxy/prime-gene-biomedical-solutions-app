"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductActions from "@/components/products/ProductActions";
import Image from "next/image";
import { formatNumber } from "@/lib/utils";
import SingleCategory from "@/components/categories/SingleCategory";
import SingleBrand from "@/components/brands/SingleBrand";
import SingleType from "@/components/productTypes/SingleType";
import SingleUnit from "@/components/units/SingleUnit";
import { Product } from "@/types";

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
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => {
      const product = row.original;
      return product.brandId ? (
        <SingleBrand brandId={product.brandId} />
      ) : (
        <span>Null</span>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const product = row.original;
      return product.typeId ? (
        <SingleType typeId={product.typeId} />
      ) : (
        <span>Null</span>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const product = row.original;
      return product.categoryId ? (
        <SingleCategory categoryId={product.categoryId} />
      ) : (
        <span>Null</span>
      );
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity At Hand",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="text-14-medium flex flex-row items-center gap-1">
          {product.quantity || 0}
          {product.unitId ? (
            <SingleUnit unitId={product.unitId} showCode={true} />
          ) : (
            <span>Null</span>
          )}
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
            {formatNumber(String(product.alertQuantity))}
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
