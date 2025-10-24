"use client";

import { ColumnDef } from "@tanstack/table-core";
import { formatDateTime } from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomerActions from "@/components/customers/CustomerActions";
import { Customer } from "@/types";
import { Country } from "country-state-city";

export const customersColumns: ColumnDef<Customer>[] = [
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
      const customer = row.original;
      return <p className="text-14-medium ">{customer.name}</p>;
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const customer = row.original;
      return <p className="text-14-medium ">{customer.email || "-"}</p>;
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const customer = row.original;
      return <p className="text-14-medium ">{customer.phone || "-"}</p>;
    },
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
      const customer = row.original;
      const address = customer.address?.address ?? "";
      const addressName = customer.address?.addressName ?? "";
      const city = customer.address?.city ?? "";
      const countryCode = customer.address?.country;
      const country = countryCode
        ? Country.getCountryByCode(countryCode)?.name ?? ""
        : "";
      return (
        <p className="text-14-medium ">
          {address ? `${address}, ` : ""}
          {city ? `${city}, ` : ""}
          {country}
          {!address && !addressName && !city && !country && "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(customer.createdAt).dateTime}
        </p>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Updated At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <p className="text-14-medium">
          {formatDateTime(customer.updatedAt).dateTime}
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <CustomerActions customer={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
