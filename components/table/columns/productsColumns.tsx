"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductActions from "@/components/products/ProductActions";
import { cn, formatNumber } from "@/lib/utils";
import { ProductWithRelations } from "@/types";
import PreviewImage from "@/components/PreviewImage";
import { Checkbox } from "@/components/ui/checkbox";
import FormatNumber from "@/components/FormatNumber";
import CategoryPath from "@/components/categories/CategoryPath";
import SingleCategory from "@/components/categories/SingleCategory";

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
    meta: {
      skipRowClick: true,
    },
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
    meta: {
      skipRowClick: true,
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
      return <FormatNumber value={product.product.costPrice} />;
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
      return (
        <p className="text-14-medium ">
          {product?.brand ? product?.brand.name : "-"}
        </p>
      );
    },
  },
  {
    id: "type.name",
    accessorKey: "type.name",
    header: "Type",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <p className="text-14-medium ">
          {product?.type ? product?.type.name : "-"}
        </p>
      );
    },
  },
  {
    id: "category.name",
    accessorKey: "category.name",
    header: "Category",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="text-14-medium ">
          {product?.category ? (
            product?.category.parentId ? (
              <CategoryPath
                categoryPath={`${product.category.path}/${product.category.id}`}
              />
            ) : (
              <SingleCategory categoryId={product.category.id} />
            )
          ) : (
            "-"
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "product.quantity",
    header: "Qnty on Hand",
    cell: ({ row }) => {
      const product = row.original.product;
      const totalInventoryStockQuantity =
        row.original.totalInventoryStockQuantity;
      const totalBackorderStockQuantity =
        row.original.totalBackorderStockQuantity;
      const unit = row.original.unit;

      const quantityOnHand =
        totalInventoryStockQuantity - totalBackorderStockQuantity;

      let backgroundColorClass = "";
      if (quantityOnHand < 0) {
        backgroundColorClass = "bg-red-600";
      } else if (
        quantityOnHand >= 0 &&
        quantityOnHand <= product.alertQuantity
      ) {
        backgroundColorClass = "bg-orange-600";
      } else if (
        quantityOnHand > product.alertQuantity &&
        quantityOnHand <= product.maxAlertQuantity
      ) {
        backgroundColorClass = "bg-[#f59e0b]";
      } else {
        backgroundColorClass = "bg-green-500";
      }

      return (
        <div
          className={`text-14-medium flex flex-row items-center justify-center gap-1 px-1.5 py-2 text-white font-bold rounded-md ${backgroundColorClass}`}
        >
          <span>{quantityOnHand}</span>
          <span>{unit ? unit.code : "-"}</span>
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
    accessorKey: "product.isActive",
    header: "Status",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              product.product.isActive &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              !product.product.isActive &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {product.product.isActive ? "Active" : "Inactive"}
          </span>
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
    meta: {
      skipRowClick: true,
    },
  },
];
