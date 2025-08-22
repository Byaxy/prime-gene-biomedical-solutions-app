"use client";

import { useShipments } from "@/hooks/useShipments";
import { DataTable } from "../table/DataTable";
import { ShipmentStatus, ShipmentWithRelations, ShippingMode } from "@/types";
import { shipmentsColumns } from "../table/columns/shipmentsColumns";
import { useState } from "react";
import ShipmentDialog from "./ShipmentDialog";

const ShipmentsTable = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(
    {} as ShipmentWithRelations
  );
  const {
    shipments,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    refetch,
    isRefetching,
    filters,
    onFilterChange,
    defaultFilterValues,
  } = useShipments({ getAllShipments: true });

  const handleRowClick = (rowData: ShipmentWithRelations) => {
    setSelectedShipment(rowData);
    setOpenDialog(true);
  };

  const shipmentFilters = {
    shippingDate: {
      type: "date" as const,
      label: "Shipment Date",
    },
    shippingMode: {
      type: "select" as const,
      label: "Shipping Mode",
      options: Object.values(ShippingMode).map((item) => ({
        label: item,
        value: item,
      })),
    },
    status: {
      type: "select" as const,
      label: "Shipment Status",
      options: Object.values(ShipmentStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
  };

  return (
    <div>
      <DataTable
        columns={shipmentsColumns}
        data={shipments || []}
        isLoading={isLoading}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        searchBy={[]}
        refetch={refetch}
        isRefetching={isRefetching}
        filters={shipmentFilters}
        filterValues={filters}
        onFilterChange={onFilterChange}
        defaultFilterValues={defaultFilterValues}
        onRowClick={handleRowClick}
      />
      <ShipmentDialog
        mode={"view"}
        open={openDialog && !!selectedShipment}
        onOpenChange={setOpenDialog}
        shipment={selectedShipment}
      />
    </div>
  );
};

export default ShipmentsTable;
