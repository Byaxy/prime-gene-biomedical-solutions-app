"use client";

import PageWraper from "@/components/PageWraper";
import ReceivedInventoryStockDialog from "@/components/receivingPurchases/ReceivedInventoryStockDialog";
import { receivedPurchasesColumns } from "@/components/table/columns/receivedPurchasesColumns";
import { DataTable } from "@/components/table/DataTable";
import { useReceivingPurchases } from "@/hooks/useReceivingPurchases";
import { ReceivedPurchaseWithRelations } from "@/types";
import { useState } from "react";

const ReceivedInventory = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] =
    useState<ReceivedPurchaseWithRelations | null>(null);
  const {
    receivedPurchases,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetch,
    isRefetching,
    onFilterChange,
    filters,
    defaultFilterValues,
  } = useReceivingPurchases({ initialPageSize: 10 });

  const inventoryFilters = {
    totalAmount: {
      type: "number" as const,
      label: "Grand Total",
    },
    receivingDate: {
      type: "date" as const,
      label: "Receiving Date",
    },
  };

  const handleRowClick = (rowData: ReceivedPurchaseWithRelations) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setOpenDialog(open);
    if (!open) {
      setSelectedRow(null);
    }
  };

  return (
    <PageWraper
      title="Received Inventory"
      buttonText="Receive Inventory"
      buttonPath="/purchases/receive-inventory"
    >
      <>
        <DataTable
          columns={receivedPurchasesColumns}
          data={receivedPurchases || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchBy={[
            "receivedPurchase.receivingOrderNumber",
            "purchaseOrder.purchaseOrderNumber",
            "vendor.name",
            "store.name",
          ]}
          refetch={refetch}
          isRefetching={isRefetching}
          filters={inventoryFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
          onRowClick={handleRowClick}
        />
        <ReceivedInventoryStockDialog
          open={openDialog && !!selectedRow}
          onOpenChange={handleCloseDialog}
          purchase={selectedRow!}
        />
      </>
    </PageWraper>
  );
};

export default ReceivedInventory;
