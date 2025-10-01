import FormatNumber from "@/components/FormatNumber";
import PurchaseOrderActions from "@/components/purchaseOrders/PurchaseOrderActions";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { PurchaseOrderWithRelations, PurchaseStatus } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export const purchaseOrderColumns: ColumnDef<PurchaseOrderWithRelations>[] = [
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
    accessorKey: "purchaseOrder.purchaseOrderDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Purchase Order Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const purchaseOrder = row.original;
      return (
        <p className="text-14-medium ">
          {
            formatDateTime(purchaseOrder.purchaseOrder.purchaseOrderDate)
              .dateTime
          }
        </p>
      );
    },
  },
  {
    id: "vendor.name",
    accessorKey: "vendor.name",
    header: "Vendor",
    cell: ({ row }) => {
      const purchaseOrder = row.original;
      return (
        <p className="text-14-medium ">
          {purchaseOrder.vendor ? purchaseOrder.vendor.name : "-"}
        </p>
      );
    },
  },
  {
    id: "purchaseOrder.purchaseOrderNumber",
    accessorKey: "purchaseOrder.purchaseOrderNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold px-0"
        >
          Purchase Order Number
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const purchaseOrder = row.original;
      return (
        <p className="text-14-medium ">
          {purchaseOrder.purchaseOrder.purchaseOrderNumber || "-"}
        </p>
      );
    },
  },
  {
    header: "Quantity",
    cell: ({ row }) => {
      const purchaseOrder = row.original;
      return (
        <p className="text-14-medium ">
          {purchaseOrder.products.reduce(
            (total, product) => total + product.quantity,
            0
          ) || "-"}
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
          Total Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const purchaseOrder = row.original;
      return (
        <p className="text-14-medium ">
          <FormatNumber value={purchaseOrder.purchaseOrder.totalAmount} />
        </p>
      );
    },
  },
  {
    accessorKey: "purchaseOrder.status",
    header: "Status",
    cell: ({ row }) => {
      const purchaseOrder = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              purchaseOrder.purchaseOrder.status === PurchaseStatus.Pending &&
                "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
              purchaseOrder.purchaseOrder.status === PurchaseStatus.Completed &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              purchaseOrder.purchaseOrder.status === PurchaseStatus.Cancelled &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {purchaseOrder.purchaseOrder.status}
          </span>
        </p>
      );
    },
  },
  {
    accessorKey: "purchaseOrder.isConvertedToPurchase",
    header: "Converted To Purchase?",
    cell: ({ row }) => {
      const purchaseOrder = row.original;
      return (
        <p>
          <span
            className={cn(
              "text-14-medium capitalize",
              purchaseOrder.purchaseOrder.isConvertedToPurchase &&
                "bg-green-500 text-white px-3 py-1 rounded-xl",
              !purchaseOrder.purchaseOrder.isConvertedToPurchase &&
                "bg-red-600 text-white px-3 py-1 rounded-xl"
            )}
          >
            {purchaseOrder.purchaseOrder.isConvertedToPurchase ? "Yes" : "No"}
          </span>
        </p>
      );
    },
    meta: {
      skipRowClick: true,
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return <PurchaseOrderActions purchaseOrder={row.original} />;
    },
    meta: {
      skipRowClick: true,
    },
  },
];
