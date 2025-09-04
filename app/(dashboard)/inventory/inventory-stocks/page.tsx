"use client";

import InventoryStats from "@/components/inventory/InventoryStats";
import InventoryStockDialog from "@/components/inventory/InventoryStockDialog";
import PageWraper from "@/components/PageWraper";
import { groupedInventoryStockColumns } from "@/components/table/columns/inventoryStockColumns";
import { DataTable } from "@/components/table/DataTable";
import { useInventoryStock } from "@/hooks/useInventoryStock";
import { useStores } from "@/hooks/useStores";
import {
  GroupedInventoryStock,
  InventoryStockWithRelations,
  Store,
} from "@/types";
import { useMemo, useState } from "react";

const InventoryStocks = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedStock, setSelectedStock] =
    useState<GroupedInventoryStock | null>(null);
  const {
    inventoryStock,
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
  } = useInventoryStock({
    initialPageSize: 10,
  });

  const { stores } = useStores({ getAllStores: true });
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
    setSelectedStock(rowData);
    setOpenDialog(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setOpenDialog(open);
    if (!open) {
      setSelectedStock(null);
    }
  };

  return (
    <PageWraper
      title="Inventory Stock List"
      buttonText="Add New/Adjust"
      buttonPath="/inventory/adjust-inventory"
    >
      <div className="flex flex-col gap-5">
        <InventoryStats />
        <DataTable
          columns={groupedInventoryStockColumns}
          data={groupedInventoryStock || []}
          isLoading={isLoading}
          totalItems={totalItems}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          filters={inventoryStockFilters}
          filterValues={filters}
          onFilterChange={onFilterChange}
          defaultFilterValues={defaultFilterValues}
          onRowClick={handleRowClick}
          refetch={refetch}
          isFetching={isFetching}
        />
        <InventoryStockDialog
          open={openDialog && !!selectedStock}
          onOpenChange={handleCloseDialog}
          stock={selectedStock!}
        />
      </div>
    </PageWraper>
  );
};

export default InventoryStocks;
