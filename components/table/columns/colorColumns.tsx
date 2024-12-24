"use client";

import { ColumnDef } from "@tanstack/table-core";
import { formatDateTime } from "@/lib/utils";
import { Colors } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import ColorActions from "@/components/colors/ColorActions";

export const colorColumns: ColumnDef<Colors>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.index + 1}</p>;
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
      return <p className="text-14-medium">{type.name}</p>;
    },
  },
  {
    accessorKey: "code",
    header: "Color",
    cell: ({ row }) => {
      const type = row.original;
      return (
        <div
          style={{ backgroundColor: type.code }}
          className="h-6 w-6 rounded-full"
        />
      );
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
      return <ColorActions color={row.original} />;
    },
  },
];
