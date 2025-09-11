import { getInventoryStock } from "@/lib/actions/inventoryStock.actions";
import OverviewCard from "../dashboard/OverviewCard";
import { InventoryStockWithRelations } from "@/types";

const InventoryStats = async () => {
  const { documents: inventoryStock } = await getInventoryStock(0, 0, true);

  // Calculate statistics
  const totalItems = inventoryStock?.length || 0;
  const totalQuantity: number =
    inventoryStock?.reduce(
      (sum: number, item: InventoryStockWithRelations) =>
        sum + (item.inventory.quantity || 0),
      0
    ) || 0;
  const totalValue =
    inventoryStock?.reduce(
      (sum: number, item: InventoryStockWithRelations) =>
        sum + (item.inventory.quantity * item.inventory.costPrice || 0),
      0
    ) || 0;

  // Count items below alert quantity
  const lowStockItems =
    inventoryStock?.filter(
      (item: InventoryStockWithRelations) =>
        item.inventory.quantity <= (item.product.alertQuantity || 0)
    ).length || 0;

  return (
    <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-2 lg:grid-cols-4">
      <OverviewCard
        title="Total Items"
        data={[
          {
            name: "Items",
            value: totalItems,
            color: "rgba(45,54,99,.75)",
          },
        ]}
        total={totalItems}
        isNumber
      />

      <OverviewCard
        title="Total Quantity"
        data={[
          {
            name: "Quantity",
            value: totalQuantity,
            color: "#72d9d6",
          },
        ]}
        total={totalQuantity}
        isNumber
      />

      <OverviewCard
        title="Inventory Value"
        data={[
          {
            name: "Value",
            value: totalValue,
            color: "#002060",
          },
        ]}
        total={totalValue}
      />

      <OverviewCard
        title="Low Stock Items"
        data={[
          {
            name: "Low Stock",
            value: lowStockItems,
            color: "#dc2626",
          },
        ]}
        total={lowStockItems}
        isNumber
      />
    </div>
  );
};

export default InventoryStats;
