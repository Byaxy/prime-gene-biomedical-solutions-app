"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatDateTime } from "@/lib/utils";
import { RoleWithPermissions } from "@/types";
import { Shield } from "lucide-react";
import RoleActions from "@/components/roles/RoleActions";

export const rolesColumns: ColumnDef<RoleWithPermissions>[] = [
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
    accessorKey: "role.name",
    header: "Role Name",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          {row.original.role.isSystemRole && (
            <Shield className="h-4 w-4 text-blue-600" />
          )}
          <p className="text-dark-500 font-medium">{row.original.role.name}</p>
        </div>
      );
    },
  },
  {
    accessorKey: "role.description",
    header: "Description",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">
          {row.original.role.description || "No description"}
        </p>
      );
    },
  },
  {
    id: "type",
    header: "Type",
    cell: ({ row }) => {
      return (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
            row.original.role.isSystemRole
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {row.original.role.isSystemRole ? "System" : "Custom"}
        </span>
      );
    },
  },
  {
    id: "permissions",
    header: "Permissions",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">
          {row.original.permissions.length} routes
        </p>
      );
    },
  },
  {
    accessorKey: "role.createdAt",
    header: "Created At",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">
          {formatDateTime(row.original.role.createdAt).dateOnly}
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const role = row.original;
      return <RoleActions role={role} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
