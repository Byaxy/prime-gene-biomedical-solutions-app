/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { flexRender, useReactTable } from "@tanstack/react-table";
import { getCoreRowModel, ColumnDef } from "@tanstack/table-core";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (rowData: TData) => void;
}
import { HeaderGroup, Header } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

export function ItemsTable<TData, TValue>({
  columns,
  data,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRowClick = (rowData: TData) => {
    if (onRowClick) {
      onRowClick(rowData);
    }
  };

  return (
    <div className="data-table">
      <Table className="shad-table [&_tr_td]:py-2 [&_tr_th]:py-2">
        <TableHeader className="bg-blue-800">
          {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
            <TableRow
              key={headerGroup.id}
              className="shad-table-row-header h-8"
            >
              {headerGroup.headers.map((header: Header<TData, unknown>) => {
                return (
                  <TableHead
                    key={header.id}
                    className="text-sm font-semibold first:pl-4"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row: any) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn("shad-table-row", onRowClick && "cursor-pointer")}
              >
                {row.getVisibleCells().map((cell: any) => {
                  const skipRowClick = cell.column.columnDef.meta?.skipRowClick;

                  return (
                    <TableCell
                      key={cell.id}
                      onClick={(e) => {
                        if (skipRowClick) {
                          e.stopPropagation();
                        } else if (onRowClick) {
                          handleRowClick(row.original);
                        }
                      }}
                      className={skipRowClick ? "relative" : ""}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
