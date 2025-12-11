import { getProducts } from "@/lib/actions/product.actions";
import { getStores } from "@/lib/actions/store.actions";
import NewStockForm from "@/components/forms/NewStockForm";
import { ProductWithRelations, Store } from "@/types";

export default async function NewStockFormWrapper() {
  const [productsData, storesData] = await Promise.all([
    getProducts(0, 0, true, { isActive: "true" }),
    getStores(0, 0, true),
  ]);

  const products: ProductWithRelations[] = productsData.documents;
  const stores: Store[] = storesData.documents;

  return <NewStockForm products={products} stores={stores} />;
}
