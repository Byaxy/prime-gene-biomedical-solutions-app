import FormatNumber from "@/components/FormatNumber";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { ReceivedPurchaseWithRelations } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export const receivedPurchasesColumns: ColumnDef<ReceivedPurchaseWithRelations>[] =
  [
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
      accessorKey: "receivedPurchase.receivingDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Received Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {formatDateTime(purchase.receivedPurchase.receivingDate).dateTime}
          </p>
        );
      },
    },
    {
      id: "receivedPurchase.receivingOrderNumber",
      accessorKey: "receivedPurchase.receivingOrderNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Receiving Order Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {purchase.receivedPurchase.receivingOrderNumber || "-"}
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
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {purchase.purchaseOrder.purchaseOrderNumber || "-"}
          </p>
        );
      },
    },
    {
      header: "Quantity",
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {purchase.products.reduce(
              (total, product) =>
                total +
                product.inventoryStock.reduce(
                  (total, stock) => total + stock.quantity,
                  0
                ),
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
            Total
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            <FormatNumber value={purchase.receivedPurchase.totalAmount} />
          </p>
        );
      },
    },
    {
      id: "vendor.name",
      accessorKey: "vendor.name",
      header: "Vendor",
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {purchase.vendor ? purchase.vendor.name : "-"}
          </p>
        );
      },
    },
    {
      id: "store.name",
      accessorKey: "store.name",
      header: "Store",
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {purchase.store ? purchase.store.name : "-"}
          </p>
        );
      },
    },
  ];
