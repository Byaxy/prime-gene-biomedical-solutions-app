import FormatNumber from "@/components/FormatNumber";
import ShipmentActions from "@/components/shipments/ShipmentActions";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { ShipmentStatus, ShipmentWithRelations } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export const shipmentsColumns: ColumnDef<ShipmentWithRelations>[] = [
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
    accessorKey: "shipment.shippingDate",
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
      const shipment = row.original;
      return (
        <p className="text-14-medium ">
          {formatDateTime(shipment.shipment.shippingDate).dateDay}
        </p>
      );
    },
  },
  {
    header: "Vendor(s)",
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <div className="text-14-medium space-y-1">
          {shipment.vendors.map((vendor) => (
            <p key={vendor.id}>{vendor.name}</p>
          ))}
        </div>
      );
    },
  },
  {
    header: "Shipper",
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <p className="text-14-medium">
          {shipment?.shippingVendor
            ? shipment.shippingVendor.name
            : shipment.shipment?.shipperName || "-"}
        </p>
      );
    },
  },
  {
    id: "shipment.shipmentRefNumber",
    accessorKey: "shipment.shipmentRefNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Shipment Ref No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <p className="text-14-medium ">
          {shipment.shipment.shipmentRefNumber || "-"}
        </p>
      );
    },
  },
  {
    id: "shipment.trackingNumber",
    accessorKey: "shipment.trackingNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Tracking No.
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <p className="text-14-medium ">
          {shipment.shipment.trackingNumber || "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "shipment.numberOfPackages",
    header: "PKG No.",
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <p className="text-14-medium ">
          {shipment.shipment.numberOfPackages || "-"}
        </p>
      );
    },
  },
  {
    accessorKey: "shipment.totalItems",
    header: "Qnty",
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <p className="text-14-medium ">{shipment.shipment.totalItems || "-"}</p>
      );
    },
  },
  {
    accessorKey: "shipment.carrierName",
    header: "Shipment Type",
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <p className="text-14-medium ">
          {shipment.shipment.carrierName || "-"}
        </p>
      );
    },
  },
  {
    header: "Gross WT (kg)",
    cell: ({ row }) => {
      const shipment = row.original;
      const grossWeight = shipment.parcels.reduce(
        (total, parcel) => total + (parcel.grossWeight || 0),
        0
      );

      return <p className="text-14-medium ">{grossWeight ?? "-"}</p>;
    },
  },
  {
    header: "VOL WT (kg)",
    cell: ({ row }) => {
      const shipment = row.original;
      const volWeight = shipment.parcels.reduce(
        (total, parcel) => total + (parcel.volumetricWeight || 0),
        0
      );

      return <p className="text-14-medium ">{volWeight ?? "-"}</p>;
    },
  },
  {
    header: "Unit Price/kg",
    cell: ({ row }) => {
      const shipment = row.original;

      return (
        <p className="text-14-medium ">
          <FormatNumber value={shipment.parcels[0]?.unitPricePerKg} />
        </p>
      );
    },
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Total Amt
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={shipment.shipment.totalAmount} />
        </p>
      );
    },
  },
  {
    accessorKey: "shipment.status",
    header: "Status",
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize whitespace-nowrap",
              shipment.shipment.status === ShipmentStatus.Pending &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              shipment.shipment.status === ShipmentStatus.InTransit &&
                "text-white bg-blue-600 px-3 py-1 rounded-xl",
              shipment.shipment.status === ShipmentStatus.Delivered &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              shipment.shipment.status === ShipmentStatus.Cancelled &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {shipment.shipment.status.replace("_", " ")}
          </span>
        </p>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <ShipmentActions shipment={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
