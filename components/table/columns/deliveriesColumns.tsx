import DeliveryActions from "@/components/deliveries/DeliveryActions";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { DeliveryWithRelations } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { Country } from "country-state-city";
import { ArrowUpDown } from "lucide-react";

export const deliveriesColumns: ColumnDef<DeliveryWithRelations>[] = [
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
    accessorKey: "delivery.deliveryDate",
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
      const delivery = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(delivery.delivery.deliveryDate).dateTime}
        </p>
      );
    },
  },
  {
    id: "delivery.deliveryRefNumber",
    accessorKey: "delivery.deliveryRefNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Delivery Ref No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const delivery = row.original;
      return (
        <p className="text-14-medium ">
          {delivery.delivery.deliveryRefNumber || "-"}
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
      const delivery = row.original;
      return (
        <p className="text-14-medium ">
          {delivery?.sale ? delivery.sale.invoiceNumber : "-"}
        </p>
      );
    },
  },
  {
    id: "customer.name",
    accessorKey: "customer.name",
    header: "Customer",
    cell: ({ row }) => {
      const delivery = row.original;
      return (
        <p className="text-14-medium ">
          {delivery.customer ? delivery.customer.name : "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "delivery.deliveryAddress",
    header: "Address",
    cell: ({ row }) => {
      const delivery = row.original;
      const address = delivery.delivery.deliveryAddress.address ?? "";
      const addressName = delivery.delivery.deliveryAddress.addressName ?? "";
      const city = delivery.delivery.deliveryAddress.city ?? "";
      const country =
        Country.getCountryByCode(delivery.delivery.deliveryAddress.country)
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
    accessorKey: "delivery.status",
    header: "Payment Status",
    cell: ({ row }) => {
      const delivery = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              delivery.delivery.status === "pending" &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              delivery.delivery.status === "in-progress" &&
                "bg-blue-600 text-white px-3 py-1 rounded-xl",
              delivery.delivery.status === "delivered" &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              delivery.delivery.status === "cancelled" &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {delivery.delivery.status}
          </span>
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <DeliveryActions delivery={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
