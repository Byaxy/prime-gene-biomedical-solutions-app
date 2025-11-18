"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { cn } from "@/lib/utils";
import {
  CommissionWithRelations,
  CommissionPaymentStatus,
  CommissionStatus,
} from "@/types";
import CommissionActions from "@/components/commissions/CommissionActions";

export const commissionColumns: ColumnDef<CommissionWithRelations>[] = [
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
    accessorKey: "commission.commissionRefNumber",
    header: "Ref. No.",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500 font-medium">
          {row.original.commission.commissionRefNumber}
        </p>
      );
    },
  },
  {
    accessorKey: "commission.commissionDate",
    header: "Date Earned",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">
          {formatDateTime(row.original.commission.commissionDate).dateOnly}
        </p>
      );
    },
  },
  {
    accessorKey: "sale.invoiceNumber",
    header: "Related Sale",
    cell: ({ row }) => {
      return <p className="text-dark-500">{row.original.sale.invoiceNumber}</p>;
    },
  },

  {
    accessorKey: "recipients",
    header: "Recipients",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">{row.original.recipients.length} Agents</p>
      );
    },
  },
  {
    accessorKey: "commission.totalCommissionPayable",
    header: "Net Payable",
    cell: ({ row }) => (
      <FormatNumber value={row.original.commission.totalCommissionPayable} />
    ),
  },
  {
    accessorKey: "commission.status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.commission.status;
      return (
        <span
          className={cn(
            "rounded-xl px-3 py-1 text-white text-14-medium capitalize",
            {
              "bg-yellow-500": status === CommissionStatus.PendingApproval,
              "bg-blue-600": status === CommissionStatus.Approved,
              "bg-green-500": status === CommissionStatus.Processed,
              "bg-red-600": status === CommissionStatus.Cancelled,
            }
          )}
        >
          {status.split("_").join(" ")}
        </span>
      );
    },
  },
  {
    accessorKey: "commission.paymentStatus",
    header: "Payment Status",
    cell: ({ row }) => {
      const paymentStatus = row.original.commission.paymentStatus;
      return (
        <span
          className={cn(
            "rounded-xl px-3 py-1 text-white text-14-medium capitalize",
            {
              "bg-yellow-500":
                paymentStatus === CommissionPaymentStatus.Pending,
              "bg-orange-500":
                paymentStatus === CommissionPaymentStatus.Partial,
              "bg-green-500": paymentStatus === CommissionPaymentStatus.Paid,
              "bg-red-600": paymentStatus === CommissionPaymentStatus.Cancelled,
            }
          )}
        >
          {paymentStatus.split("_").join(" ")}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const commission = row.original;
      return <CommissionActions commission={commission} />;
    },
  },
];
