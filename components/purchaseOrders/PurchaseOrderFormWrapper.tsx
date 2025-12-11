import { notFound } from "next/navigation";
import { getProducts } from "@/lib/actions/product.actions";
import {
  generatePurchaseOrderNumber,
  getPurchaseOrderById,
  getPurchaseOrders,
} from "@/lib/actions/purchaseOrder.actions";
import { getVendors } from "@/lib/actions/vendor.actions";
import {
  ProductWithRelations,
  PurchaseOrderWithRelations,
  Vendor,
} from "@/types";
import PurchaseOrderForm from "../forms/PurchaseOrderForm";

interface Props {
  mode: "create" | "edit";
  purchaseOrderId?: string;
}

const PurchaseOrderFormWrapper = async ({ mode, purchaseOrderId }: Props) => {
  const [productsData, vendorsData, purchaseOrdersData] = await Promise.all([
    getProducts(0, 0, true, { isActive: "true" }),
    getVendors(0, 0, true),
    getPurchaseOrders(0, 0, true),
  ]);

  const products: ProductWithRelations[] = productsData.documents;
  const vendors: Vendor[] = vendorsData.documents;
  const allPurchaseOrders: PurchaseOrderWithRelations[] =
    purchaseOrdersData.documents;

  let initialData: PurchaseOrderWithRelations | undefined = undefined;
  let generatedPurchaseOrderNumber: string | undefined = undefined;

  if (mode === "edit") {
    if (!purchaseOrderId) notFound();
    const fetchedPurchaseOrder = await getPurchaseOrderById(purchaseOrderId);
    if (!fetchedPurchaseOrder) notFound();
    initialData = fetchedPurchaseOrder;
  } else if (mode === "create") {
    generatedPurchaseOrderNumber = await generatePurchaseOrderNumber();
  }

  return (
    <PurchaseOrderForm
      mode={mode}
      initialData={initialData}
      products={products}
      vendors={vendors}
      purchaseOrders={allPurchaseOrders}
      generatedPurchaseOrderNumber={generatedPurchaseOrderNumber}
    />
  );
};

export default PurchaseOrderFormWrapper;
