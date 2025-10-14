import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncomeCategoryWithRelations } from "@/types";
import IncomeCategoryActions from "@/components/incomeCategories/IncomeCategoryActions";

export const incomeCategoriesColumns: ColumnDef<IncomeCategoryWithRelations>[] =
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
      id: "incomeCategory.name",
      accessorKey: "category.name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Category Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const category = row.original;
        return (
          <p className="text-14-medium ">{category.incomeCategory.name}</p>
        );
      },
    },
    {
      id: "incomeCategory.description",
      accessorKey: "incomeCategory.description",
      header: "Description",
      cell: ({ row }) => {
        const category = row.original;
        return (
          <p className="text-14-medium ">
            {category.incomeCategory.description || "-"}
          </p>
        );
      },
    },
    {
      id: "chartOfAccount.accountName",
      accessorKey: "chartOfAccount.accountName",
      header: "Linked CoA",
      cell: ({ row }) => {
        const category = row.original;
        return (
          <p className="text-14-medium ">
            {category.chartOfAccount?.accountName || "-"}
          </p>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return <IncomeCategoryActions category={row.original} />;
      },
      meta: {
        skipRowClick: true,
      },
    },
  ];
