import FormatNumber from "@/components/FormatNumber";
import Loading from "@/app/(dashboard)/loading";
import ReceivedPurchaseActions from "@/components/receivingPurchases/ReceivedPurchaseActions";
import { Button } from "@/components/ui/button";
import { getPurchaseById } from "@/lib/actions/purchase.actions";
import { cn, formatDateTime } from "@/lib/utils";
import {
  GroupedReceivedPurchases,
  PurchaseItem,
  ReceivedPurchaseWithRelations,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
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
      id: "purchase.purchaseNumber",
      accessorKey: "purchase.purchaseNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Purchased Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {purchase.purchase.purchaseNumber || "-"}
          </p>
        );
      },
    },
    {
      id: "purchase.vendorInvoiceNumber",
      accessorKey: "purchase.vendorInvoiceNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Vendor Invoice Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {purchase.purchase.vendorInvoiceNumber || "-"}
          </p>
        );
      },
    },
    {
      header: "Total Quantity",
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <div className="text-14-medium flex items-center gap-1">
            {purchase.products.reduce(
              (total, product) =>
                total +
                product.inventoryStock.reduce(
                  (total, stock) => total + stock.quantity,
                  0
                ),
              0
            ) || "-"}
            <div>
              <PurchasedQnty purchaseId={purchase.purchase.id} />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "receivedPurchase.totalAmount",
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
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            <FormatNumber value={purchase.receivedPurchase.totalAmount} />
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return <ReceivedPurchaseActions purchase={row.original} />;
      },
      meta: {
        skipRowClick: true,
      },
    },
  ];

export const PurchasedQnty = ({ purchaseId }: { purchaseId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: [purchaseId],
    queryFn: async () => {
      if (!purchaseId) return null;
      return await getPurchaseById(purchaseId as string);
    },
    enabled: !!purchaseId,
  });

  if (isLoading) {
    return <Loading size={15} showText={false} />;
  }
  return (
    <div>
      (
      {data ? (
        <span className="text-14-medium">
          {data.products.reduce(
            (total: number, product: PurchaseItem) => total + product.quantity,
            0
          )}
        </span>
      ) : (
        "-"
      )}
      )
    </div>
  );
};

export const PurchasedQntyStatus = ({ purchaseId }: { purchaseId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: [purchaseId],
    queryFn: async () => {
      if (!purchaseId) return null;
      return await getPurchaseById(purchaseId as string);
    },
    enabled: !!purchaseId,
  });

  if (isLoading) {
    return <Loading size={15} showText={false} />;
  }

  const totalQuantity = data?.products.reduce(
    (total: number, product: PurchaseItem) => total + product.quantity,
    0
  );
  const receivedQuantity = data?.products.reduce(
    (total: number, product: PurchaseItem) => total + product.quantityReceived,
    0
  );

  return (
    <div>
      {data ? (
        <span
          className={cn(
            "text-14-medium capitalize",
            receivedQuantity !== undefined && totalQuantity !== undefined
              ? receivedQuantity < totalQuantity
                ? "text-white bg-[#f59e0b] px-3 py-1 rounded-xl"
                : "bg-green-500 text-white px-3 py-1 rounded-xl"
              : ""
          )}
        >
          {receivedQuantity < totalQuantity ? "Partial" : "Complete"}
        </span>
      ) : (
        "-"
      )}
    </div>
  );
};

export const groupedReceivedPurchasesColumns: ColumnDef<GroupedReceivedPurchases>[] =
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
      accessorKey: "latestReceivingDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Latest Received Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {formatDateTime(purchase.latestReceivingDate).dateTime}
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
      id: "purchase.purchaseNumber",
      accessorKey: "purchase.purchaseNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Purchased Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {purchase.purchase.purchaseNumber || "-"}
          </p>
        );
      },
    },
    {
      id: "purchase.vendorInvoiceNumber",
      accessorKey: "purchase.vendorInvoiceNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Vendor Invoice Number
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            {purchase.purchase.vendorInvoiceNumber || "-"}
          </p>
        );
      },
    },
    {
      accessorKey: "totalReceivedPurchases",
      header: "Batches",
      cell: ({ row }) => {
        const purchase = row.original;
        return (
          <p className="text-14-medium ">{purchase.totalReceivedPurchases}</p>
        );
      },
    },
    {
      header: "Total Quantity",
      cell: ({ row }) => {
        const purchase = row.original;
        let quantityReceived = 0;
        purchase.receivedPurchases.forEach((receivedPurchase) => {
          receivedPurchase.products.forEach((product) => {
            quantityReceived += product.inventoryStock.reduce(
              (total, stock) => total + stock.quantity,
              0
            );
          });
        });
        return (
          <div className="text-14-medium flex items-center gap-1">
            {quantityReceived}
            <div>
              <PurchasedQnty purchaseId={purchase.purchase.id} />
            </div>
          </div>
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
        const purchase = row.original;
        return (
          <p className="text-14-medium ">
            <FormatNumber value={purchase.totalAmount} />
          </p>
        );
      },
    },
    {
      header: "Status",
      cell: ({ row }) => {
        const purchase = row.original;
        return <PurchasedQntyStatus purchaseId={purchase.purchase.id} />;
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
