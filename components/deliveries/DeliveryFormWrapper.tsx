import { notFound } from "next/navigation";
import {
  generateDeliveryRefNumber,
  getDeliveries,
  getDeliveryById,
} from "@/lib/actions/delivery.actions";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getStores } from "@/lib/actions/store.actions";
import { getSales, getSaleById } from "@/lib/actions/sale.actions";
import DeliveryForm from "@/components/forms/DeliveryForm";
import {
  Customer,
  Store,
  SaleWithRelations,
  DeliveryWithRelations,
} from "@/types";

interface DeliveryFormWrapperProps {
  mode: "create" | "edit";
  deliveryId?: string;
  sourceSaleId?: string;
}

export default async function DeliveryFormWrapper({
  mode,
  deliveryId,
  sourceSaleId,
}: DeliveryFormWrapperProps) {
  const [deliveriesData, customersData, storesData, salesData] =
    await Promise.all([
      getDeliveries(0, 0, true),
      getCustomers(0, 0, true),
      getStores(0, 0, true),
      getSales(0, 0, true),
    ]);

  const deliveries: DeliveryWithRelations[] = deliveriesData.documents;
  const customers: Customer[] = customersData.documents;
  const stores: Store[] = storesData.documents;
  const allSales: SaleWithRelations[] = salesData.documents;

  let initialData: DeliveryWithRelations | undefined = undefined;
  let sourceSale: SaleWithRelations | undefined = undefined;
  let generatedDeliveryRefNumber: string | undefined = undefined;

  // Specific data fetches based on mode
  if (mode === "edit") {
    if (!deliveryId) notFound();
    const fetchedDelivery = await getDeliveryById(deliveryId);
    if (!fetchedDelivery) notFound();
    initialData = fetchedDelivery;
  } else if (mode === "create") {
    generatedDeliveryRefNumber = await generateDeliveryRefNumber();
    if (sourceSaleId) {
      const fetchedSale = await getSaleById(sourceSaleId);
      if (!fetchedSale) notFound();
      sourceSale = fetchedSale;
    }
  }

  return (
    <DeliveryForm
      mode={mode}
      initialData={initialData}
      sourceSale={sourceSale}
      deliveries={deliveries}
      customers={customers}
      stores={stores}
      sales={allSales}
      generatedDeliveryRefNumber={generatedDeliveryRefNumber}
    />
  );
}
