"use client";

import PageWraper from "@/components/PageWraper";
import { waybillColumns } from "@/components/table/columns/waybillColumns";
import { DataTable } from "@/components/table/DataTable";
import WaybillDialog from "@/components/waybills/WaybillDialog";
import { useWaybills } from "@/hooks/useWaybills";
import { DeliveryStatus, WaybillWithRelations } from "@/types";
import { useState } from "react";

const Waybills = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState(
    {} as WaybillWithRelations
  );
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
  } = useWaybills({ initialPageSize: 10 });

  const handleRowClick = (rowData: WaybillWithRelations) => {
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

  return (
    <PageWraper
      title="Way Bills"
      buttonText="Add Waybill"
      buttonPath="/waybills/create-waybill"
    >
      <>
        <DataTable
          columns={waybillColumns}
          data={waybills || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchBy={[
            "waybill.waybillsRefNumber",
            "customer.name",
            "sale.invoiceNumber",
          ]}
          onRowClick={handleRowClick}
          filters={waybillsFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
        />
        <WaybillDialog
          mode={"view"}
          open={openDialog && !!selectedWaybill}
          onOpenChange={setOpenDialog}
          waybill={selectedWaybill}
        />
      </>
    </PageWraper>
  );
};

export default Waybills;
