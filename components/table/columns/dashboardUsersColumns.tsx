"use client";

import { ColumnDef } from "@tanstack/table-core";
import { Users } from "@/types/appwrite.types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export const dashboardUsersColumns: ColumnDef<Users>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium pl-2">{row.index + 1}</p>;
    },
  },
  {
    header: "Image",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center">
          <Image
            src={user.profileImageUrl || "/assets/images/user.png"}
            alt={user.name}
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
      const user = row.original;
      return <p className="text-14-medium ">{user.name}</p>;
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const user = row.original;
      return <p className="text-14-medium ">{user.email || "-"}</p>;
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const user = row.original;
      return <p className="text-14-medium ">{user.phone || "-"}</p>;
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const user = row.original;
      return <p className="text-14-medium ">{user.role || "-"}</p>;
    },
  },
];
