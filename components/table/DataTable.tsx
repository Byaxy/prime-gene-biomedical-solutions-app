/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  flexRender,
  SortingState,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from "@tanstack/react-table";
import { getCoreRowModel, ColumnDef } from "@tanstack/table-core";
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
import { HeaderGroup, Header } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { Input } from "../ui/input";
import Loading from "@/components/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Trash2Icon } from "lucide-react";
import { DownloadIcon } from "lucide-react";
import Image from "next/image";
import { Search } from "lucide-react";
import FiltersSheet from "./FiltersSheet";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  hideSearch?: boolean;
  pageSize: number;
  totalItems: number;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  searchBy?: string | string[];
  onDeleteSelected?: (items: TData[]) => void;
  isDeletingSelected?: boolean;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  onDownloadSelected?: (items: TData[]) => void;
  filters?: {
    [key: string]: {
      type: "text" | "number" | "date" | "select";
      label: string;
      options?: { value: string; label: string }[]; // For select type
    };
  };
  filterValues?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  defaultFilterValues?: Record<string, any>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  hideSearch,
  totalItems,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  searchBy,
  onDeleteSelected,
  isDeletingSelected,
  onRowSelectionChange,
  rowSelection,
  onDownloadSelected,
  filters,
  filterValues = {},
  onFilterChange,
  defaultFilterValues,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [localFilters, setLocalFilters] =
    useState<Record<string, any>>(filterValues);
  const [isFilterDirty, setIsFilterDirty] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: (updaterOrValue) => {
      const newSelection =
        typeof updaterOrValue === "function"
          ? updaterOrValue(table.getState().rowSelection)
          : updaterOrValue;
      onRowSelectionChange?.(newSelection);
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;

      const searchColumns = Array.isArray(searchBy)
        ? searchBy
        : searchBy
        ? [searchBy]
        : ["name"];

      return searchColumns.some((colId) => {
        const value = row.getValue(colId);
        return String(value).toLowerCase().includes(filterValue.toLowerCase());
      });
    },
    state: {
      sorting,
      globalFilter,
      pagination: {
        pageIndex: page,
        pageSize,
      },
      rowSelection: rowSelection || {},
    },
    pageCount: Math.ceil(totalItems / pageSize),
    manualPagination: true,
  });

  useEffect(() => {
    setLocalFilters(filterValues);
    setIsFilterDirty(false);
  }, [filterValues]);

  const handleLocalFilterChange = (key: string, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
    setIsFilterDirty(true);
  };

  const handleApplyFilters = () => {
    onFilterChange?.(localFilters);
    setIsFilterDirty(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = { ...defaultFilterValues };
    setLocalFilters(clearedFilters);
    onFilterChange?.(clearedFilters);
    setIsFilterDirty(false);
  };

  return (
    <div>
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 pb-5 sm:pb-0">
        {!hideSearch && (
          <div className="relative w-full sm:w-1/2 flex items-center py-4">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-600"
              size={16}
            />
            <Input
              placeholder={"Search..."}
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="w-full pl-10 placeholder:text-dark-600 border-dark-700 h-11 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        )}

        {filters && (
          <div className="flex flex-row gap-4">
            <Button
              variant="outline"
              className="border-blue-800/60 text-dark-500"
              onClick={handleClearFilters}
              disabled={
                !Object.values(filterValues).some(
                  (val) => val !== undefined && val !== ""
                )
              }
            >
              Clear Filters
            </Button>
            <FiltersSheet
              filters={filters}
              filterValues={filterValues}
              localFilters={localFilters}
              handleApplyFilters={handleApplyFilters}
              handleClearFilters={handleClearFilters}
              handleLocalFilterChange={handleLocalFilterChange}
              isFilterDirty={isFilterDirty}
            />
          </div>
        )}
      </div>

      {table.getSelectedRowModel().rows.length > 0 && (
        <div className="w-full bg-white py-4 px-5 rounded-lg shadow-md flex items-center justify-between mt-2 mb-4">
          <div className="text-blue-800 text-sm font-semibold">
            {table.getSelectedRowModel().rows.length} Rows Selected
          </div>
          <div className="flex gap-2">
            {onDeleteSelected && (
              <Button
                disabled={isDeletingSelected}
                variant="default"
                size="sm"
                className="shad-danger-btn"
                onClick={async () => {
                  const selectedRows = table
                    .getSelectedRowModel()
                    .rows.map((row) => row.original);

                  await onDeleteSelected(selectedRows);
                }}
              >
                {isDeletingSelected ? (
                  <div className="flex items-center gap-4">
                    <Image
                      src="/assets/icons/loader.svg"
                      alt="loader"
                      width={20}
                      height={20}
                      className="animate-spin"
                    />
                    Deleting...
                  </div>
                ) : (
                  <>
                    <Trash2Icon className="h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            )}
            {onDownloadSelected && (
              <Button
                variant="outline"
                size="sm"
                className="shad-primary-btn"
                onClick={() => {
                  const selectedProducts = table
                    .getSelectedRowModel()
                    .rows.map((row) => row.original);

                  onDownloadSelected?.(selectedProducts);
                }}
              >
                <DownloadIcon className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
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

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-6 px-3">
          <div className="w-full flex items-center gap-2">
            <span className="text-xs sm:text-sm text-dark-600">
              Rows per page:
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const newPageSize = Number(value);
                onPageSizeChange?.(newPageSize);
                // Reset to first page when changing page size
                onPageChange?.(0);
              }}
            >
              <SelectTrigger className="w-16 text-dark-600">
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
            <span className="text-xs sm:text-sm text-dark-600">
              {page * pageSize + 1}-
              {Math.min((page + 1) * pageSize, totalItems)} of {totalItems}
            </span>
          </div>
          <div className="w-full flex flex-row items-center justify-between sm:justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 0}
              className="shad-primary-btn border-0"
            >
              <KeyboardArrowLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= Math.ceil(totalItems / pageSize) - 1}
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
