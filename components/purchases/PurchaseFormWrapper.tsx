import { notFound } from "next/navigation";
import { getProducts } from "@/lib/actions/product.actions";
import {
  generatePurchaseNumber,
  getPurchaseById,
  getPurchases,
} from "@/lib/actions/purchase.actions";
import {
  getPurchaseOrderById,
  getPurchaseOrders,
} from "@/lib/actions/purchaseOrder.actions";
import { getVendors } from "@/lib/actions/vendor.actions";
import {
  ProductWithRelations,
  PurchaseOrderWithRelations,
  PurchaseWithRelations,
  Vendor,
} from "@/types";
import PurchaseForm from "../forms/PurchaseForm";

interface Props {
  mode: "create" | "edit";
  sourcePurchaseOrderId?: string;
  purchaseId?: string;
}

const PurchaseFormWrapper = async ({
  mode,
  sourcePurchaseOrderId,
  purchaseId,
}: Props) => {
  const [productsData, vendorsData, purchaseOrdersData, purchaseData] =
    await Promise.all([
      getProducts(0, 0, true, { isActive: "true" }),
      getVendors(0, 0, true),
      getPurchaseOrders(0, 0, true),
      getPurchases(0, 0, true),
    ]);

  const products: ProductWithRelations[] = productsData.documents;
  const vendors: Vendor[] = vendorsData.documents;
  const purchaseOrders: PurchaseOrderWithRelations[] =
    purchaseOrdersData.documents;

  const purchases: PurchaseWithRelations[] = purchaseData.documents;

  let initialData: PurchaseWithRelations | undefined = undefined;
  let sourcePurchaseOrder: PurchaseOrderWithRelations | undefined = undefined;
  let generatedPurchaseNumber: string | undefined = undefined;

  if (mode === "edit") {
    if (!purchaseId) notFound();
    const fetchedPurchase = await getPurchaseById(purchaseId);
    if (!fetchedPurchase) notFound();
    initialData = fetchedPurchase;
  } else if (mode === "create") {
    generatedPurchaseNumber = await generatePurchaseNumber();
    if (sourcePurchaseOrderId) {
      const fetchedPurchaseOrder = await getPurchaseOrderById(
        sourcePurchaseOrderId
      );
      if (!fetchedPurchaseOrder) notFound();
      sourcePurchaseOrder = fetchedPurchaseOrder;
    }
  }

  return (
    <PurchaseForm
      mode={mode}
      initialData={initialData}
      products={products}
      vendors={vendors}
      purchaseOrders={purchaseOrders}
      generatedPurchaseNumber={generatedPurchaseNumber}
      sourcePurchaseOrder={sourcePurchaseOrder}
      purchases={purchases}
    />
  );
};

export default PurchaseFormWrapper;
