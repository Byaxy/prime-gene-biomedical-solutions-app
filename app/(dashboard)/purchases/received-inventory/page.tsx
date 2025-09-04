"use client";

import PageWraper from "@/components/PageWraper";
import ReceivedPurchasesListDialog from "@/components/receivingPurchases/ReceivedPurchasesListDialog";
import { groupedReceivedPurchasesColumns } from "@/components/table/columns/receivedPurchasesColumns";
import { DataTable } from "@/components/table/DataTable";
import { useReceivingPurchases } from "@/hooks/useReceivingPurchases";
import {
  GroupedReceivedPurchases,
  ReceivedPurchaseWithRelations,
} from "@/types";
import { useMemo, useState } from "react";

const ReceivedInventory = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] =
    useState<GroupedReceivedPurchases | null>(null);
  const {
    receivedPurchases,
    isLoading,
    totalItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    refetch,
    isFetching,
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

  const groupedReceivedPurchases = useMemo<GroupedReceivedPurchases[]>(() => {
    if (!receivedPurchases || receivedPurchases.length === 0) {
      return [];
    }

    const grouped = receivedPurchases.reduce(
      (
        acc: Record<string, GroupedReceivedPurchases>,
        receivedPurchase: ReceivedPurchaseWithRelations
      ) => {
        const purchaseKey = receivedPurchase.purchase.purchaseNumber;

        if (!acc[purchaseKey]) {
          acc[purchaseKey] = {
            id: purchaseKey,
            purchase: receivedPurchase.purchase,
            vendor: receivedPurchase.vendor,
            store: receivedPurchase.store,
            totalReceivedPurchases: 0,
            totalAmount: 0,
            receivedPurchases: [],
            latestReceivingDate:
              receivedPurchase.receivedPurchase.receivingDate,
            latestVendorParkingListNumber:
              receivedPurchase.receivedPurchase.vendorParkingListNumber,
          };
        }

        const group = acc[purchaseKey];

        // Add received purchase item
        group.receivedPurchases.push(receivedPurchase);

        // Update totals
        group.totalReceivedPurchases += 1;
        group.totalAmount += receivedPurchase.receivedPurchase.totalAmount;

        // Update latest receiving date and parking list number
        if (
          receivedPurchase.receivedPurchase.receivingDate >
          group.latestReceivingDate
        ) {
          group.latestReceivingDate =
            receivedPurchase.receivedPurchase.receivingDate;
          group.latestVendorParkingListNumber =
            receivedPurchase.receivedPurchase.vendorParkingListNumber;
        }

        return acc;
      },
      {}
    );

    return Object.values(grouped);
  }, [receivedPurchases]);

  const handleRowClick = (rowData: GroupedReceivedPurchases) => {
    setSelectedRow(rowData);
    setOpenDialog(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setOpenDialog(open);
    if (!open) {
      setSelectedRow({} as GroupedReceivedPurchases);
    }
  };

  return (
    <PageWraper
      title="Received Inventory"
      buttonText="Receive Purchased Inventory."
      buttonPath="/purchases/receive-purchased-inventory"
    >
      <>
        <DataTable
          columns={groupedReceivedPurchasesColumns}
          data={groupedReceivedPurchases || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          refetch={refetch}
          isFetching={isFetching}
          filters={inventoryFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
          onRowClick={handleRowClick}
        />
        <ReceivedPurchasesListDialog
          open={openDialog && !!selectedRow}
          onOpenChange={handleCloseDialog}
          receivedPurchases={selectedRow?.receivedPurchases || []}
        />
      </>
    </PageWraper>
  );
};

export default ReceivedInventory;
