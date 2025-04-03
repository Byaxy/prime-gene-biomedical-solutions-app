import BrandActions from "@/components/brands/BrandActions";
import PreviewImage from "@/components/PreviewImage";
import { Button } from "@/components/ui/button";
import { Brand } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export const brandColumns: ColumnDef<Brand>[] = [
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
    header: "Image",
    cell: ({ row }) => {
      const brand = row.original;
      return <PreviewImage imageUrl={brand.imageUrl ?? ""} />;
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
      const brand = row.original;
      return <p className="text-14-medium ">{brand.name}</p>;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const brand = row.original;
      return <p className="text-14-medium">{brand.description || "-"}</p>;
    },
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <BrandActions brand={row.original} />;
    },
  },
];
