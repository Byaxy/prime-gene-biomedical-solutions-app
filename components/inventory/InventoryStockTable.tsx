"use client";

import { useDebounce } from "@/hooks/useDebounce";
import {
  InventoryStockFilters,
  useInventoryStock,
} from "@/hooks/useInventoryStock";
import { useStores } from "@/hooks/useStores";
import {
  GroupedInventoryStock,
  InventoryStockWithRelations,
  Store,
} from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "../table/DataTable";
import { groupedInventoryStockColumns } from "../table/columns/inventoryStockColumns";
import InventoryStockDialog from "./InventoryStockDialog";

interface Props {
  initialData: { documents: InventoryStockWithRelations[]; total: number };
}

const InventoryStockTable = ({ initialData }: Props) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<GroupedInventoryStock | null>(
    null
  );
  const { stores } = useStores({ getAllStores: true });
  const {
    inventoryStock,
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
  } = useInventoryStock({
    initialData,
  });

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Apply debounced search
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch);
    }
  }, [debouncedSearch, search, setSearch]);

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
    (newFilters: InventoryStockFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  // Group inventory stock by product
  const groupedInventoryStock = useMemo<GroupedInventoryStock[]>(() => {
    if (!inventoryStock || inventoryStock.length === 0) {
      return [];
    }

    const grouped = inventoryStock.reduce(
      (
        acc: Record<string, GroupedInventoryStock>,
        item: InventoryStockWithRelations
      ) => {
        const productKey = `${item.product.id}-${item.store.id}`;

        if (!acc[productKey]) {
          acc[productKey] = {
            id: productKey,
            product: item.product,
            store: item.store,
            totalQuantity: 0,
            avgCostPrice: 0,
            avgSellingPrice: 0,
            stockBatches: [],
            earliestManufactureDate: null,
            nearestExpiryDate: null,
            latestReceivedDate: item.inventory.receivedDate,
          };
        }

        const group = acc[productKey];

        // Add stock batch
        group.stockBatches.push({
          id: item.inventory.id,
          receivedDate: item.inventory.receivedDate,
          lotNumber: item.inventory.lotNumber,
          quantity: item.inventory.quantity,
          costPrice: item.inventory.costPrice,
          sellingPrice: item.inventory.sellingPrice,
          manufactureDate: item.inventory.manufactureDate,
          expiryDate: item.inventory.expiryDate,
        });

        // Update totals and averages
        group.totalQuantity += item.inventory.quantity;

        // Calculate weighted averages for prices
        const totalBatches = group.stockBatches.length;
        group.avgCostPrice =
          group.stockBatches.reduce((sum, batch) => sum + batch.costPrice, 0) /
          totalBatches;
        group.avgSellingPrice =
          group.stockBatches.reduce(
            (sum, batch) => sum + batch.sellingPrice,
            0
          ) / totalBatches;

        // Update dates
        if (item.inventory.receivedDate > group.latestReceivedDate) {
          group.latestReceivedDate = item.inventory.receivedDate;
        }

        if (item.inventory.manufactureDate) {
          if (
            !group.earliestManufactureDate ||
            item.inventory.manufactureDate < group.earliestManufactureDate
          ) {
            group.earliestManufactureDate = item.inventory.manufactureDate;
          }
        }

        if (item.inventory.expiryDate) {
          if (
            !group.nearestExpiryDate ||
            item.inventory.expiryDate < group.nearestExpiryDate
          ) {
            group.nearestExpiryDate = item.inventory.expiryDate;
          }
        }

        return acc;
      },
      {}
    );

    return Object.values(grouped);
  }, [inventoryStock]);

  const inventoryStockFilters = {
    quantity: {
      type: "number" as const,
      label: "Quantity",
    },
    costPrice: {
      type: "number" as const,
      label: "Cost Price",
    },
    sellingPrice: {
      type: "number" as const,
      label: "Selling Price",
    },
    expiryDate: {
      type: "date" as const,
      label: "Expiry Date",
    },
    manufactureDate: {
      type: "date" as const,
      label: "Manufacture Date",
    },
    store: {
      type: "select" as const,
      label: "Store",
      options:
        stores &&
        stores.map((item: Store) => ({
          label: item.name,
          value: item.id,
        })),
    },
  };

  const handleRowClick = (rowData: GroupedInventoryStock) => {
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
    <>
      <DataTable
        columns={groupedInventoryStockColumns}
        data={groupedInventoryStock || []}
        isLoading={isLoading}
        isFetching={isFetching}
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRowClick={handleRowClick}
        refetch={refetch}
        filters={inventoryStockFilters}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        searchTerm={localSearch}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />
      <InventoryStockDialog
        open={openDialog && !!selectedRow}
        onOpenChange={handleCloseDialog}
        stock={selectedRow!}
      />
    </>
  );
};

export default InventoryStockTable;
