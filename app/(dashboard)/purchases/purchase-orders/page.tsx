"use client";

import PageWraper from "@/components/PageWraper";
import PurchaseOrderDialog from "@/components/purchaseOrders/PurchaseOrderDialog";
import { purchaseOrderColumns } from "@/components/table/columns/purchaseOrderColumns";
import { DataTable } from "@/components/table/DataTable";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { PurchaseOrderWithRelations, PurchaseStatus } from "@/types";
import React, { useState } from "react";

const PurchaseOrders = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(
    {} as PurchaseOrderWithRelations
  );
  const {
    purchaseOrders,
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
  } = usePurchaseOrders({ initialPageSize: 10 });

  const handleRowClick = (rowData: PurchaseOrderWithRelations) => {
    setSelectedPurchaseOrder(rowData);
    setOpenDialog(true);
  };

  const purchaseOrderFilters = {
    totalAmount: {
      type: "number" as const,
      label: "Grand Total",
    },
    purchaseOrderDate: {
      type: "date" as const,
      label: "Purchase Order Date",
    },
    status: {
      type: "select" as const,
      label: "Purchase Order Status",
      options: Object.values(PurchaseStatus).map((item) => ({
        label: item,
        value: item,
      })),
    },
  };

  return (
    <PageWraper
      title="Purchase Orders"
      buttonText="Add Purchase Order"
      buttonPath="/purchases/create-purchase-order"
    >
      <>
        <DataTable
          columns={purchaseOrderColumns}
          data={purchaseOrders || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchBy={["purchase.purchaseNumber", "vendor.name"]}
          refetch={refetch}
          isRefetching={isRefetching}
          filters={purchaseOrderFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
          onRowClick={handleRowClick}
        />
        <PurchaseOrderDialog
          mode={"view"}
          open={openDialog && !!selectedPurchaseOrder}
          onOpenChange={setOpenDialog}
          purchaseOrder={selectedPurchaseOrder}
        />
      </>
    </PageWraper>
  );
};

export default PurchaseOrders;
