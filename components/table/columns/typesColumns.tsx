"use client";

import { ColumnDef } from "@tanstack/table-core";
import { formatDateTime } from "@/lib/utils";
import { ProductTypes } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

import TypeActions from "@/components/productTypes/TypeActions";

export const typesColumns: ColumnDef<ProductTypes>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium ">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },

    cell: ({ row }) => {
      const type = row.original;
      return <p className="text-14-medium ">{type.name}</p>;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const type = row.original;
      return <p className="text-14-medium ">{type.description || "-"}</p>;
    },
  },
  {
    accessorKey: "$createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const type = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(type.$createdAt).dateTime}
        </p>
      );
    },
  },
  {
    accessorKey: "$updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Updated At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const type = row.original;
      return (
        <p className="text-14-medium">
          {formatDateTime(type.$updatedAt).dateTime}
        </p>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="pl-4">Actions</div>,
    cell: ({ row }) => {
      return <TypeActions productType={row.original} />;
    },
  },
];
