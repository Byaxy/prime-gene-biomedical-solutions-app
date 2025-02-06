/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  flexRender,
  SortingState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef,
} from "@tanstack/table-core";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import { Button } from "@/components/ui/button";
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
  isLoading?: boolean;
  hideSearch?: boolean;
  pageSize?: number;
}
import { HeaderGroup, Header } from "@tanstack/react-table";
import { useState } from "react";
import { Input } from "../ui/input";
import Loading from "@/components/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  hideSearch,
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: pageSize,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  });

  // Get the searchable column
  const searchableColumn = table.getColumn("name") || table.getColumn("title");

  return (
    <div>
      {!hideSearch && (
        <div className="flex items-center py-4">
          <Input
            placeholder={`Search by ${searchableColumn?.id}`}
            value={(searchableColumn?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              searchableColumn?.setFilterValue(event.target.value)
            }
            className="max-w-lg placeholder:text-dark-500 border-dark-700 h-11 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      )}

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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <Loading />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: any) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="shad-table-row"
                >
                  {row.getVisibleCells().map((cell: any) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between my-6 px-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-dark-600">Rows per page:</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="w-20 text-dark-600">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {[5, 10, 15, 20, 25, 30].map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                    className="text-dark-600 hover:text-white hover:bg-blue-800 cursor-pointer rounded-md"
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="shad-primary-btn border-0"
            >
              <KeyboardArrowLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="shad-primary-btn border-0"
            >
              <KeyboardArrowRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
