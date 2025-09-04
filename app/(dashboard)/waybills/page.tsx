"use client";

import PageWraper from "@/components/PageWraper";
import { groupedWaybillColumns } from "@/components/table/columns/waybillColumns";
import { DataTable } from "@/components/table/DataTable";
import WaybillListDialog from "@/components/waybills/WaybillListDialog";
import { useWaybills } from "@/hooks/useWaybills";
import { DeliveryStatus, GroupedWaybills, WaybillWithRelations } from "@/types";
import { useMemo, useState } from "react";

const Waybills = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState({} as GroupedWaybills);
  const {
    waybills,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    filters,
    onFilterChange,
    defaultFilterValues,
    refetch,
    isFetching,
  } = useWaybills({ initialPageSize: 10 });

  const handleRowClick = (rowData: GroupedWaybills) => {
    setSelectedWaybill(rowData);
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

  return (
    <PageWraper
      title="Way Bills"
      buttonText="Add Waybill"
      buttonPath="/waybills/create-waybill"
    >
      <>
        <DataTable
          columns={groupedWaybillColumns}
          data={groupedWaybills || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onRowClick={handleRowClick}
          filters={waybillsFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
          refetch={refetch}
          isFetching={isFetching}
        />
        <WaybillListDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          waybills={selectedWaybill.waybills || []}
        />
      </>
    </PageWraper>
  );
};

export default Waybills;
