import { getProducts } from "@/lib/actions/product.actions";
import { getStores } from "@/lib/actions/store.actions";
import NewStockForm from "@/components/forms/NewStockForm";
import {
  InventoryStockWithRelations,
  ProductWithRelations,
  Store,
} from "@/types";
import { getInventoryStock } from "@/lib/actions/inventoryStock.actions";

export default async function NewStockFormWrapper() {
  const [productsData, storesData, inventoryStockData] = await Promise.all([
    getProducts(0, 0, true, { isActive: "true" }),
    getStores(0, 0, true),
    getInventoryStock(0, 0, true),
  ]);

  const products: ProductWithRelations[] = productsData.documents;
  const stores: Store[] = storesData.documents;
  const inventoryStock: InventoryStockWithRelations[] =
    inventoryStockData.documents;

  return (
    <NewStockForm
      products={products}
      stores={stores}
      inventoryStock={inventoryStock}
    />
  );
}
