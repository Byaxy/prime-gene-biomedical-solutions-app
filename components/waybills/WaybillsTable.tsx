"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { useWaybills, WaybillFilters } from "@/hooks/useWaybills";
import {
  DeliveryStatus,
  GroupedWaybills,
  WaybillConversionStatus,
  WaybillType,
  WaybillWithRelations,
} from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "../table/DataTable";
import { groupedWaybillColumns } from "../table/columns/waybillColumns";
import WaybillListDialog from "./WaybillListDialog";

interface Props {
  initialData: { documents: WaybillWithRelations[]; total: number };
}

const WaybillsTable = ({ initialData }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<GroupedWaybills>(
    {} as GroupedWaybills
  );

  const {
    waybills,
    totalItems,
    page,
    pageSize,
    search,
    filters,
    isLoading,
    isFetching,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    clearFilters,
    refetch,
  } = useWaybills({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

  const handleRowClick = (rowData: GroupedWaybills) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  };

  const waybillsFilters = {
    waybillDate: {
      type: "date" as const,
      label: "Waybill Date",
    },
    status: {
      type: "select" as const,
      label: "Waybill Status",
      options: Object.values(DeliveryStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
    conversionStatus: {
      type: "select" as const,
      label: "Conversion Status",
      options: Object.values(WaybillConversionStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
    waybillType: {
      type: "select" as const,
      label: "Waybill Type",
      options: Object.values(WaybillType).map((item) => ({
        label: item,
        value: item,
      })),
    },
    isConverted: {
      type: "select" as const,
      label: "Is Converted ?",
      options: [
        { value: "true", label: "True" },
        { value: "false", label: "False" },
      ],
    },
  };

  const groupedWaybills = useMemo<GroupedWaybills[]>(() => {
    if (!waybills || waybills.length === 0) {
      return [];
    }

    const grouped = waybills.reduce(
      (acc: Record<string, GroupedWaybills>, waybill: WaybillWithRelations) => {
        const saleKey = waybill.waybill.saleId || `loan-${waybill.waybill.id}`;

        if (!acc[saleKey]) {
          acc[saleKey] = {
            id: saleKey,
            customer: waybill.customer || null,
            sale: waybill.sale || null,
            totalWaybills: 0,
            waybills: [],
            latestWaybillDate: waybill.waybill.waybillDate,
            latestWaybillRefNumber: waybill.waybill.waybillRefNumber,
          };
        }

        const group = acc[saleKey];

        // Add waybill item
        group.waybills.push(waybill);

        // Update totals
        group.totalWaybills += 1;

        if (waybill.waybill.waybillDate > group.latestWaybillDate) {
          group.latestWaybillDate = waybill.waybill.waybillDate;
          group.latestWaybillRefNumber = waybill.waybill.waybillRefNumber;
        }

        return acc;
      },
      {}
    );

    return Object.values(grouped);
  }, [waybills]);

  // Event handlers
  const handleSearchChange = useCallback((newSearch: string) => {
    setLocalSearch(newSearch);
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    setSearch("");
  }, [setSearch]);

  const handleClearFilters = useCallback(() => {
    setLocalSearch("");
    setSearch("");
    clearFilters();
  }, [clearFilters, setSearch]);

  const handleFilterChange = useCallback(
    (newFilters: WaybillFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );
  // handle close dialog
  const closeDialog = () => {
    setOpenDialog(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

  return (
    <>
      <DataTable
        columns={groupedWaybillColumns}
        data={groupedWaybills || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={waybillsFilters}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <WaybillListDialog
        open={openDialog && !!selectedRow}
        onOpenChange={closeDialog}
        waybills={selectedRow.waybills || []}
      />
    </>
  );
};

export default WaybillsTable;
