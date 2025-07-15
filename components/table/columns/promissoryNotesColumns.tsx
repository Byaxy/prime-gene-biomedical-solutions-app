import PromissoryNoteActions from "@/components/promissoryNotes/PromissoryNoteActions";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import { PromissoryNoteStatus, PromissoryNoteWithRelations } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export const promissoryNotesColumns: ColumnDef<PromissoryNoteWithRelations>[] =
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
      accessorKey: "promissoryNote.promissoryNoteDate",
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
        const promissoryNote = row.original;
        return (
          <p className="text-14-medium ">
            {
              formatDateTime(promissoryNote.promissoryNote.promissoryNoteDate)
                .dateTime
            }
          </p>
        );
      },
    },
    {
      id: "promissoryNote.promissoryNoteRefNumber",
      accessorKey: "promissoryNote.promissoryNoteRefNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="font-semibold px-0"
          >
            Promissory Note Ref No.
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const promissoryNote = row.original;
        return (
          <p className="text-14-medium ">
            {promissoryNote.promissoryNote.promissoryNoteRefNumber || "-"}
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
        const promissoryNote = row.original;
        return (
          <p className="text-14-medium ">
            {promissoryNote.sale.invoiceNumber || "-"}
          </p>
        );
      },
    },
    {
      id: "customer.name",
      accessorKey: "customer.name",
      header: "Customer",
      cell: ({ row }) => {
        const promissoryNote = row.original;
        return (
          <p className="text-14-medium ">
            {promissoryNote.customer ? promissoryNote.customer.name : "-"}
          </p>
        );
      },
    },
    {
      accessorKey: "promissoryNote.status",
      header: "Status",
      cell: ({ row }) => {
        const promissoryNote = row.original;
        return (
          <p>
            <span
              className={cn(
                "text-14-medium capitalize",
                promissoryNote.promissoryNote.status ===
                  PromissoryNoteStatus.Pending &&
                  "text-white bg-[#f59e0b] px-3 py-1 rounded-xl",
                promissoryNote.promissoryNote.status ===
                  PromissoryNoteStatus.Partial &&
                  "bg-blue-600 text-white px-3 py-1 rounded-xl",
                promissoryNote.promissoryNote.status ===
                  PromissoryNoteStatus.Fulfiled &&
                  "bg-green-500 text-white px-3 py-1 rounded-xl",
                promissoryNote.promissoryNote.status ===
                  PromissoryNoteStatus.Cancelled &&
                  "bg-red-600 text-white px-3 py-1 rounded-xl"
              )}
            >
              {promissoryNote.promissoryNote.status}
            </span>
          </p>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return <PromissoryNoteActions promissoryNote={row.original} />;
      },
      meta: {
        skipRowClick: true,
      },
    },
  ];
