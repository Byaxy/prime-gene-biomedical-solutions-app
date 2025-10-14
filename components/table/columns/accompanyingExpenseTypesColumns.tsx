"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccompanyingExpenseTypeWithRelations } from "@/types";
import AccompanyingExpenseTypeActions from "@/components/accompanyingExpenses/AccompanyingExpenseTypeActions";

export const accompanyingExpenseTypesColumns: ColumnDef<AccompanyingExpenseTypeWithRelations>[] =
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
      id: "type.name",
      accessorKey: "type.name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Type Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const type = row.original;
        return <p className="text-14-medium ">{type.type.name}</p>;
      },
    },
    {
      id: "type.description",
      accessorKey: "type.description",
      header: "Description",
      cell: ({ row }) => {
        const type = row.original;
        return (
          <p className="text-14-medium ">{type.type.description || "-"}</p>
        );
      },
    },
    {
      id: "defaultCategory.name",
      accessorKey: "defaultCategory.name",
      header: "Default Expense Category",
      cell: ({ row }) => {
        const type = row.original;
        return (
          <p className="text-14-medium ">{type.defaultCategory?.name || "-"}</p>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <AccompanyingExpenseTypeActions accompanyingType={row.original} />
        );
      },
      meta: {
        skipRowClick: true,
      },
    },
  ];
