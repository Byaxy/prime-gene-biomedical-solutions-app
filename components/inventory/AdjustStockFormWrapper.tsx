import { InventoryStockWithRelations, Store } from "@/types";
import { getStores } from "@/lib/actions/store.actions";
import { getInventoryStock } from "@/lib/actions/inventoryStock.actions";
import AdjustStockForm from "../forms/AdjustStockForm";

export default async function AdjustStockFormWrapper() {
  const [storesData, inventoryStockData] = await Promise.all([
    getStores(0, 0, true),
    getInventoryStock(0, 0, true),
  ]);

  const stores: Store[] = storesData.documents;
  const inventoryStock: InventoryStockWithRelations[] =
    inventoryStockData.documents;

  return <AdjustStockForm stores={stores} inventoryStock={inventoryStock} />;
}
