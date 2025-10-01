import { getProducts } from "@/lib/actions/product.actions";
import { getPurchases } from "@/lib/actions/purchase.actions";
import { getReceivedPurchaseById } from "@/lib/actions/receivingPurchases.actions";
import { getStores } from "@/lib/actions/store.actions";
import { getVendors } from "@/lib/actions/vendor.actions";
import {
  ProductWithRelations,
  PurchaseWithRelations,
  ReceivedPurchaseWithRelations,
  Store,
  Vendor,
} from "@/types";
import { notFound } from "next/navigation";
import React from "react";
import RecievingPurchaseForm from "../forms/RecievingPurchaseForm";

interface Props {
  mode: "create" | "edit";
  receivedPurchaseId?: string;
}

const RecievingPurchaseFormWrapper = async ({
  mode,
  receivedPurchaseId,
}: Props) => {
  const [productsData, vendorsData, storesData, purchaseData] =
    await Promise.all([
      getProducts(0, 0, true, { isActive: "true" }),
      getVendors(0, 0, true),
      getStores(0, 0, true),
      getPurchases(0, 0, true),
    ]);

  const products: ProductWithRelations[] = productsData.documents;
  const vendors: Vendor[] = vendorsData.documents;
  const purchases: PurchaseWithRelations[] = purchaseData.documents;
  const stores: Store[] = storesData.documents;

  let initialData: ReceivedPurchaseWithRelations | undefined = undefined;

  if (mode === "edit") {
    if (!receivedPurchaseId) notFound();
    const fetchedPurchase = await getReceivedPurchaseById(receivedPurchaseId);
    if (!fetchedPurchase) notFound();
    initialData = fetchedPurchase;
  }
  return (
    <RecievingPurchaseForm
      mode={mode}
      initialData={initialData}
      products={products}
      vendors={vendors}
      stores={stores}
      purchases={purchases}
    />
  );
};

export default RecievingPurchaseFormWrapper;
