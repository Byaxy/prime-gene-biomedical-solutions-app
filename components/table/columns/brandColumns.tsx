import BrandActions from "@/components/brands/BrandActions";
import { Button } from "@/components/ui/button";
import { Brand } from "@/types/appwrite.types";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import Image from "next/image";

export const brandColumns: ColumnDef<Brand>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.index + 1}</p>;
    },
  },
  {
    header: "Image",
    cell: ({ row }) => {
      const brand = row.original;
      return (
        <div className="flex items-center">
          <Image
            src={brand.imageUrl || "/assets/images/placeholder.jpg"}
            alt={brand.name}
            width={50}
            height={50}
            className="h-12 w-12 rounded-full object-cover"
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
