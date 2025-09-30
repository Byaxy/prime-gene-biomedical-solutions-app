"use client";

import { useDebounce } from "@/hooks/useDebounce";
import {
  ReceivedPurchaseFilters,
  useReceivingPurchases,
} from "@/hooks/useReceivingPurchases";
import {
  GroupedReceivedPurchases,
  ReceivedPurchaseWithRelations,
} from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "../table/DataTable";
import ReceivedPurchasesListDialog from "./ReceivedPurchasesListDialog";
import { groupedReceivedPurchasesColumns } from "../table/columns/receivedPurchasesColumns";

interface Props {
  initialData: { documents: ReceivedPurchaseWithRelations[]; total: number };
}
const ReceivedPurchasesTable = ({ initialData }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<GroupedReceivedPurchases>(
    {} as GroupedReceivedPurchases
  );

  const {
    receivedPurchases,
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
  } = useReceivingPurchases({ initialData });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

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
    (newFilters: ReceivedPurchaseFilters) => {
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
        columns={groupedReceivedPurchasesColumns}
        data={groupedReceivedPurchases || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={inventoryFilters}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <ReceivedPurchasesListDialog
        open={openDialog && !!selectedRow}
        onOpenChange={closeDialog}
        receivedPurchases={selectedRow?.receivedPurchases || []}
      />
    </>
  );
};

export default ReceivedPurchasesTable;
