"use client";

import { ColumnDef } from "@tanstack/table-core";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { User } from "@/types";
import SingleRole from "@/components/roles/SingleRole";

export const dashboardUsersColumns: ColumnDef<User>[] = [
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
      return (
        <div className="text-14-medium ">
          <SingleRole roleId={user.roleId} />
        </div>
      );
    },
  },
];
