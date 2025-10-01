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
import { useCallback, useMemo, useState } from "react";
import { Input } from "../ui/input";
import Loading from "@/app/(dashboard)/loading";
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
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { FileText } from "lucide-react";
import { X } from "lucide-react";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint, @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends unknown, TValue> {
    skipRowClick?: boolean;
  }
}

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
  onDeleteSelected?: (items: TData[]) => void;
  isDeletingSelected?: boolean;
  onDeactivateSelected?: (items: TData[]) => void;
  isDeactivatingSelected?: boolean;
  onReactivateSelected?: (items: TData[]) => void;
  isReactivatingSelected?: boolean;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  onDownloadSelected?: (items: TData[]) => void;
  filters?: {
    [key: string]: {
      type: "text" | "number" | "date" | "select" | "boolean";
      label: string;
      options?: { value: string; label: string }[]; // For select type
    };
  };
  filterValues?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  defaultFilterValues?: Record<string, any> | null;
  onRowClick?: (rowData: TData) => void;
  refetch?: () => void;
  searchTerm?: string;
  onSearchChange?: (search: string) => void;
  onClearSearch?: () => void;
  isFetching?: boolean;
  onClearFilters?: () => void;
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
  onDeleteSelected,
  isDeletingSelected,
  onDeactivateSelected,
  isDeactivatingSelected,
  onReactivateSelected,
  isReactivatingSelected,
  onRowSelectionChange,
  rowSelection,
  onDownloadSelected,
  filters,
  filterValues = {},
  onFilterChange,
  onRowClick,
  refetch,
  searchTerm = "",
  onSearchChange,
  onClearSearch,
  isFetching,
  onClearFilters,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

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

    state: {
      sorting,
      pagination: {
        pageIndex: page,
        pageSize,
      },
      rowSelection: rowSelection || {},
    },
    pageCount: Math.ceil(totalItems / pageSize),
    manualPagination: true,
    enableRowSelection: true,
  });

  // Memoize pagination info
  const paginationInfo = useMemo(() => {
    const isShowingAll = pageSize === 0 || pageSize >= totalItems;
    const start = isShowingAll ? 1 : page * pageSize + 1;
    const end = isShowingAll
      ? totalItems
      : Math.min((page + 1) * pageSize, totalItems);

    return {
      isShowingAll,
      start,
      end,
      canGoNext: !isShowingAll && (page + 1) * pageSize < totalItems,
      canGoPrev: page > 0 && !isShowingAll,
    };
  }, [page, pageSize, totalItems]);

  // Event handlers
  const handleRowClick = useCallback(
    (rowData: TData, event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      const shouldSkipRowClick =
        target.closest("[data-no-row-click]") ||
        target.getAttribute("role") === "checkbox" ||
        target.getAttribute("role") === "menuitem" ||
        target.closest('[role="checkbox"]') ||
        target.closest("a");
      if (shouldSkipRowClick) {
        return;
      }
      onRowClick?.(rowData);
    },
    [onRowClick]
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const newSize = value === "all" ? 0 : Number(value);
      onPageSizeChange(newSize);
    },
    [onPageSizeChange]
  );

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
              value={searchTerm}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="w-full pl-10 placeholder:text-dark-600 border-dark-700 h-11 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-600 hover:text-dark-600/80"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-row gap-4">
          {filters && (
            <div className="flex flex-row gap-4">
              <Button
                variant="outline"
                className="border-blue-800/60 text-dark-500 bg-blue-50"
                onClick={onClearFilters}
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
                onFilterChange={onFilterChange}
              />
            </div>
          )}
          {refetch && (
            <Button
              type="button"
              size={"icon"}
              onClick={refetch}
              className="self-end shad-primary-btn px-5"
              disabled={isLoading || isFetching}
            >
              <RefreshCw
                className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      </div>

      <div className="data-table">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-6 px-3">
          <div className="w-full flex items-center gap-2">
            <span className="text-xs sm:text-sm text-dark-600">
              Rows per page:
            </span>
            <Select
              value={paginationInfo.isShowingAll ? "all" : String(pageSize)}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-16 text-dark-600">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {[5, 10, 25, 30, 50, 100].map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                    className="text-dark-600 hover:text-white hover:bg-blue-800 cursor-pointer rounded-md"
                  >
                    {size}
                  </SelectItem>
                ))}
                <SelectItem
                  value="all"
                  className="text-dark-600 hover:text-white hover:bg-blue-800 cursor-pointer rounded-md"
                >
                  All
                </SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs sm:text-sm text-dark-600">
              {paginationInfo.isShowingAll
                ? `Showing all ${totalItems} items`
                : `${paginationInfo.start}-${paginationInfo.end} of ${totalItems}`}
            </span>
          </div>

          <div className="w-full flex flex-col sm:flex-row items-center justify-between sm:justify-end gap-5">
            {table.getSelectedRowModel().rows.length > 0 && (
              <div className="w-full flex items-center justify-between">
                <div className="text-blue-800 text-sm font-semibold">
                  {table.getSelectedRowModel().rows.length} Rows Selected
                </div>
                <div className="flex gap-2">
                  {onReactivateSelected && (
                    <Button
                      disabled={isReactivatingSelected}
                      variant="default"
                      size="sm"
                      className="shad-green-btn"
                      onClick={async () => {
                        const selectedRows = table
                          .getSelectedRowModel()
                          .rows.map((row) => row.original);

                        await onReactivateSelected(selectedRows);
                      }}
                    >
                      {isReactivatingSelected ? (
                        <div className="flex items-center gap-4">
                          <Image
                            src="/assets/icons/loader.svg"
                            alt="loader"
                            width={20}
                            height={20}
                            className="animate-spin"
                          />
                          Activating...
                        </div>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                  )}

                  {onDeactivateSelected && (
                    <Button
                      disabled={isDeactivatingSelected}
                      variant="default"
                      size="sm"
                      className="shad-danger-btn"
                      onClick={async () => {
                        const selectedRows = table
                          .getSelectedRowModel()
                          .rows.map((row) => row.original);

                        await onDeactivateSelected(selectedRows);
                      }}
                    >
                      {isDeactivatingSelected ? (
                        <div className="flex items-center gap-4">
                          <Image
                            src="/assets/icons/loader.svg"
                            alt="loader"
                            width={20}
                            height={20}
                            className="animate-spin"
                          />
                          Deactivating...
                        </div>
                      ) : (
                        <>
                          <Trash2Icon className="h-4 w-4" />
                          Deactivate
                        </>
                      )}
                    </Button>
                  )}

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

            <div className="w-full sm:w-fit flex items-center justify-between sm:justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={!paginationInfo.canGoPrev || isFetching}
                className="shad-primary-btn border-0"
              >
                <KeyboardArrowLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={!paginationInfo.canGoNext || isFetching}
                className="shad-primary-btn border-0"
              >
                <KeyboardArrowRightIcon />
              </Button>
            </div>
          </div>
        </div>
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
                  className={cn(
                    "shad-table-row",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={(e) => {
                    if (onRowClick) {
                      handleRowClick(row.original, e);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell: any) => {
                    const skipRowClick =
                      cell.column.columnDef.meta?.skipRowClick;

                    return (
                      <TableCell
                        key={cell.id}
                        {...(skipRowClick && { "data-no-row-click": true })}
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
      </div>
    </div>
  );
}
