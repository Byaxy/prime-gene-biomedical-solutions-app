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
}
import { HeaderGroup, Header } from "@tanstack/react-table";

export function ItemsTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
                className="shad-table-row"
              >
                {row.getVisibleCells().map((cell: any) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
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
