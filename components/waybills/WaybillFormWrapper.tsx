import { notFound } from "next/navigation";
import {
  generateWaybillRefNumber,
  getWaybillById,
  getWaybills,
} from "@/lib/actions/waybill.actions";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getStores } from "@/lib/actions/store.actions";
import { getSales, getSaleById } from "@/lib/actions/sale.actions";
import { getProducts } from "@/lib/actions/product.actions";
import { getInventoryStock } from "@/lib/actions/inventoryStock.actions";

import WaybillForm from "@/components/forms/WaybillForm";
import {
  Customer,
  Store,
  SaleWithRelations,
  ProductWithRelations,
  InventoryStockWithRelations,
  WaybillWithRelations,
} from "@/types";

interface WaybillFormWrapperProps {
  mode: "create" | "edit";
  waybillId?: string;
  sourceSaleId?: string;
}

export default async function WaybillFormWrapper({
  mode,
  waybillId,
  sourceSaleId,
}: WaybillFormWrapperProps) {
  const [
    customersData,
    storesData,
    salesData,
    productsData,
    inventoryStockData,
    allWaybillsData,
  ] = await Promise.all([
    getCustomers(0, 0, true),
    getStores(0, 0, true),
    getSales(0, 0, true),
    getProducts(0, 0, true, { isActive: "true" }),
    getInventoryStock(0, 0, true),
    getWaybills(0, 0, true),
  ]);

  const customers: Customer[] = customersData.documents;
  const stores: Store[] = storesData.documents;
  const allSales: SaleWithRelations[] = salesData.documents;
  const products: ProductWithRelations[] = productsData.documents;
  const inventoryStock: InventoryStockWithRelations[] =
    inventoryStockData.documents;
  const allWaybills: WaybillWithRelations[] = allWaybillsData.documents;

  let initialData: WaybillWithRelations | undefined = undefined;
  let sourceSale: SaleWithRelations | undefined = undefined;
  let generatedWaybillRefNumber: string | undefined = undefined;

  if (mode === "edit") {
    if (!waybillId) notFound();
    const fetchedWaybill = await getWaybillById(waybillId);
    if (!fetchedWaybill) notFound();
    initialData = fetchedWaybill;
  } else if (mode === "create") {
    generatedWaybillRefNumber = await generateWaybillRefNumber();
    if (sourceSaleId) {
      const fetchedSale = await getSaleById(sourceSaleId);
      if (!fetchedSale) notFound();
      sourceSale = fetchedSale;
    }
  }

  return (
    <WaybillForm
      mode={mode}
      initialData={initialData}
      sourceSale={sourceSale}
      customers={customers}
      stores={stores}
      sales={allSales}
      products={products}
      inventoryStock={inventoryStock}
      waybills={allWaybills}
      generatedWaybillRefNumber={generatedWaybillRefNumber}
    />
  );
}
