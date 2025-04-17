"use client";

import InventoryStats from "@/components/inventory/InventoryStats";
import PageWraper from "@/components/PageWraper";
import { inventoryStockColumns } from "@/components/table/columns/inventoryStockColumns";
import { DataTable } from "@/components/table/DataTable";
import { useInventoryStock } from "@/hooks/useInventoryStock";
import { useStores } from "@/hooks/useStores";
import { Store } from "@/types";

const InventoryStocks = () => {
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
  } = useInventoryStock({
    initialPageSize: 10,
  });

  const { stores } = useStores({ getAllStores: true });

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

  return (
    <PageWraper
      title="Inventory Stock List"
      buttonText="Add New/Adjust"
      buttonPath="/inventory/adjust-inventory"
    >
      <>
        <InventoryStats />
        <DataTable
          columns={inventoryStockColumns}
          data={inventoryStock || []}
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
          searchBy={[
            "product.name",
            "product.productID",
            "inventory.lotNumber",
            "store.name",
          ]}
        />
      </>
    </PageWraper>
  );
};

export default InventoryStocks;
