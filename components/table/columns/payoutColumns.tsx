"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { GetCommissionPayoutWithRelations } from "@/types";

export const payoutColumns: ColumnDef<GetCommissionPayoutWithRelations>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row, table }) => {
      const pagination = table.getState().pagination;
      const globalIndex =
        pagination.pageIndex * pagination.pageSize + row.index + 1;
      return <span className="text-dark-500">{globalIndex}</span>;
    },
    enableSorting: false,
  },
  {
    accessorKey: "payout.payoutRefNumber",
    header: "Payout Ref. No.",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500 font-medium">
          {row.original.payout.payoutRefNumber}
        </p>
      );
    },
  },
  {
    accessorKey: "payout.payoutDate",
    header: "Payout Date",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">
          {formatDateTime(row.original.payout.payoutDate).dateOnly}
        </p>
      );
    },
  },
  {
    accessorKey: "commissionRecipient.salesAgent.name",
    header: "Sales Agent",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">
          {row.original.commissionRecipient.salesAgent.name}
        </p>
      );
    },
  },
  {
    accessorKey: "commissionRecipient.commission.commissionRefNumber",
    header: "Commission Ref.",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">
          {row.original.commissionRecipient.commission.commissionRefNumber}
        </p>
      );
    },
  },
  {
    accessorKey: "relatedInvoiceNumbers",
    header: "Related Sales",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">{row.original.relatedInvoiceNumbers}</p>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "payingAccount.name",
    header: "Paying Account",
    cell: ({ row }) => {
      return <p className="text-dark-500">{row.original.payingAccount.name}</p>;
    },
  },
  {
    accessorKey: "expenseCategory.name",
    header: "Expense Category",
    cell: ({ row }) => {
      return (
        <p className="text-dark-500">{row.original.expenseCategory.name}</p>
      );
    },
  },
  {
    accessorKey: "payout.amount",
    header: "Amount Paid",
    cell: ({ row }) => <FormatNumber value={row.original.payout.amount} />,
  },
];
