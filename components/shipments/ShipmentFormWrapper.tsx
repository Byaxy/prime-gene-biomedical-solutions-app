import { getProducts } from "@/lib/actions/product.actions";
import { getPurchases } from "@/lib/actions/purchase.actions";
import {
  generateShipmentRefNumber,
  getShipmentById,
  getShipments,
} from "@/lib/actions/shipment.actions";
import { getVendors } from "@/lib/actions/vendor.actions";
import {
  ProductWithRelations,
  PurchaseWithRelations,
  ShipmentWithRelations,
  Vendor,
} from "@/types";
import { notFound } from "next/navigation";
import ShipmentForm from "../forms/ShipmentForm";

interface Props {
  mode: "create" | "edit";
  shipmentId?: string;
}

const ShipmentFormWrapper = async ({ mode, shipmentId }: Props) => {
  const [productsData, vendorsData, purchaseData, shipmentsData] =
    await Promise.all([
      getProducts(0, 0, true, { isActive: "true" }),
      getVendors(0, 0, true),
      getPurchases(0, 0, true),
      getShipments(0, 0, true),
    ]);

  const products: ProductWithRelations[] = productsData.documents;
  const vendors: Vendor[] = vendorsData.documents;
  const purchases: PurchaseWithRelations[] = purchaseData.documents;
  const shipments: ShipmentWithRelations[] = shipmentsData.documents;

  let initialData: ShipmentWithRelations | undefined = undefined;
  let generatedShipmentNumber: string | undefined = undefined;

  if (mode === "edit") {
    if (!shipmentId) notFound();
    const fetchedShipment = await getShipmentById(shipmentId);
    if (!fetchedShipment) notFound();
    initialData = fetchedShipment;
  } else if (mode === "create") {
    generatedShipmentNumber = await generateShipmentRefNumber();
  }
  return (
    <ShipmentForm
      mode={mode}
      initialData={initialData}
      products={products}
      vendors={vendors}
      purchases={purchases}
      shipments={shipments}
      generatedShipmentNumber={generatedShipmentNumber}
    />
  );
};

export default ShipmentFormWrapper;
