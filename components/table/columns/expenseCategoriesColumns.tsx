import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseCategoryWithRelations } from "@/types";
import ExpenseCategoryActions from "@/components/expenseCategories/ExpenseCategoryActions";

export const expenseCategoriesColumns: ColumnDef<ExpenseCategoryWithRelations>[] =
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
      id: "expenseCategory.name",
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
          <p className="text-14-medium ">{category.expenseCategory.name}</p>
        );
      },
    },
    {
      id: "expenseCategory.description",
      accessorKey: "expenseCategory.description",
      header: "Description",
      cell: ({ row }) => {
        const category = row.original;
        return (
          <p className="text-14-medium ">
            {category.expenseCategory.description || "-"}
          </p>
        );
      },
    },
    {
      id: "expenseCategory.path",
      accessorKey: "expenseCategory.path",
      header: "Path",
      cell: ({ row }) => {
        const category = row.original;

        return (
          <p className="text-14-medium ">
            {category.expenseCategory.path || "-"}
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
        return <ExpenseCategoryActions category={row.original} />;
      },
      meta: {
        skipRowClick: true,
      },
    },
  ];
