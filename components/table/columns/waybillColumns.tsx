import WaybillActions from "@/components/waybills/WaybillActions";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { WaybillType, WaybillWithRelations } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { Country } from "country-state-city";
import { ArrowUpDown } from "lucide-react";

export const waybillColumns: ColumnDef<WaybillWithRelations>[] = [
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
    accessorKey: "waybill.waybillDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const waybill = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(waybill.waybill.waybillDate).dateTime}
        </p>
      );
    },
  },
  {
    id: "waybill.waybillRefNumber",
    accessorKey: "waybill.waybillRefNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Waybill Ref No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const waybill = row.original;
      return (
        <p className="text-14-medium ">
          {waybill.waybill.waybillRefNumber || "-"}
        </p>
      );
    },
  },
  {
    id: "sale.invoiceNumber",
    accessorKey: "sale.invoiceNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Sale Ref No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const waybill = row.original;
      return (
        <p className="text-14-medium ">
          {waybill?.sale ? waybill.sale.invoiceNumber : "-"}
        </p>
      );
    },
  },
  {
    id: "customer.name",
    accessorKey: "customer.name",
    header: "Customer",
    cell: ({ row }) => {
      const waybill = row.original;
      return (
        <p className="text-14-medium ">
          {waybill.customer ? waybill.customer.name : "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "waybill.deliveryAddress",
    header: "Address",
    cell: ({ row }) => {
      const waybill = row.original;
      const address = waybill.waybill.deliveryAddress.address ?? "";
      const addressName = waybill.waybill.deliveryAddress.addressName ?? "";
      const city = waybill.waybill.deliveryAddress.city ?? "";
      const country =
        Country.getCountryByCode(waybill.waybill.deliveryAddress.country)
          ?.name ?? "";
      return (
        <p className="text-14-medium ">
          {addressName ? `${addressName}, ` : ""}
          {address ? `${address}, ` : ""}
          {city ? `${city}, ` : ""}
          {country}
          {!address && !addressName && !city && !country && "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "waybill.status",
    header: "Status",
    cell: ({ row }) => {
      const waybill = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              waybill.waybill.status === "pending" &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              waybill.waybill.status === "in-progress" &&
                "bg-blue-600 text-white px-3 py-1 rounded-xl",
              waybill.waybill.status === "delivered" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              waybill.waybill.status === "cancelled" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {waybill.waybill.status}
          </span>
        </p>
      );
    },
  },
  {
    header: "Type",
    cell: ({ row }) => {
      const waybill = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              waybill.waybill.waybillType === `${WaybillType.Sale}` &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              waybill.waybill.waybillType === `${WaybillType.Loan}` &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {waybill.waybill.waybillType}
          </span>
        </p>
      );
    },
  },
  {
    header: "Converted",
    cell: ({ row }) => {
      const waybill = row.original;
      return (
        <p>
          {waybill.waybill.waybillType === WaybillType.Loan && (
            <span
              className={cn(
                "text-14-medium capitalize bg-red-600 text-white px-3 py-1 rounded-xl",
                waybill.waybill.isConverted && "bg-green-500"
              )}
            >
              {waybill.waybill.isConverted ? "Yes" : "No"}
            </span>
          )}
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <WaybillActions waybill={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
