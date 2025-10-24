import { notFound } from "next/navigation";
import {
  generateInvoiceNumber,
  getSaleById,
  getSales,
} from "@/lib/actions/sale.actions";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getProducts } from "@/lib/actions/product.actions";
import { getTaxes } from "@/lib/actions/tax.actions";
import { getStores } from "@/lib/actions/store.actions";
import {
  getQuotations,
  getQuotationById,
} from "@/lib/actions/quotation.actions";
import { getInventoryStock } from "@/lib/actions/inventoryStock.actions";
import SaleForm from "@/components/forms/SaleForm";
import {
  QuotationWithRelations,
  SaleWithRelations,
  Customer,
  ProductWithRelations,
  Tax,
  Store,
  InventoryStockWithRelations,
  SaleStatus,
  PaymentStatus,
  PaymentMethod,
  Delivery,
  PromissoryNote,
} from "@/types";

interface SaleFormWrapperProps {
  mode: "create" | "edit" | "duplicate";
  saleId?: string;
  sourceQuotationId?: string;
}

export default async function SaleFormWrapper({
  mode,
  saleId,
  sourceQuotationId,
}: SaleFormWrapperProps) {
  const [
    customersData,
    productsData,
    taxesData,
    storesData,
    quotationsData,
    inventoryStockData,
    salesData,
  ] = await Promise.all([
    getCustomers(0, 0, true),
    getProducts(0, 0, true, { isActive: "true" }),
    getTaxes(0, 0, true),
    getStores(0, 0, true),
    getQuotations(0, 0, true),
    getInventoryStock(0, 0, true),
    getSales(0, 0, true),
  ]);

  const customers: Customer[] = customersData.documents;
  const products: ProductWithRelations[] = productsData.documents;
  const taxes: Tax[] = taxesData.documents;
  const stores: Store[] = storesData.documents;
  const allQuotations: QuotationWithRelations[] = quotationsData.documents;
  const inventoryStock: InventoryStockWithRelations[] =
    inventoryStockData.documents;
  const sales: SaleWithRelations[] = salesData.documents;

  let initialData: SaleWithRelations | undefined = undefined;
  let sourceQuotation: QuotationWithRelations | undefined = undefined;
  let generatedInvoiceNumber: string | undefined = undefined;

  if (mode === "edit" || mode === "duplicate") {
    if (!saleId) notFound();
    const fetchedSale = await getSaleById(saleId);
    if (!fetchedSale) notFound();
    initialData = fetchedSale;

    if (mode === "duplicate") {
      generatedInvoiceNumber = await generateInvoiceNumber();
      initialData = {
        ...initialData,
        sale: {
          ...initialData?.sale,
          id: "",
          saleDate: initialData?.sale.saleDate
            ? new Date(initialData.sale.saleDate)
            : new Date(),
          customerId: initialData?.sale.customerId || "",
          storeId: initialData?.sale.storeId || "",
          subTotal: initialData?.sale.subTotal || 0,
          invoiceNumber: generatedInvoiceNumber,
          status: SaleStatus.Pending,
          paymentStatus: PaymentStatus.Pending,
          amountPaid: 0,
          paymentMethod: initialData?.sale.paymentMethod || PaymentMethod.Cash,
          discountAmount: initialData?.sale.discountAmount || 0,
          totalTaxAmount: initialData?.sale.totalTaxAmount || 0,
          totalAmount: initialData?.sale.totalAmount || 0,
          attachments: initialData?.sale.attachments || [],
          isDeliveryAddressAdded:
            initialData?.sale.isDeliveryAddressAdded || false,
          deliveryAddress: {
            addressName: initialData?.sale.deliveryAddress?.addressName || "",
            address: initialData?.sale.deliveryAddress?.address || "",
            city: initialData?.sale.deliveryAddress?.city || "",
            state: initialData?.sale.deliveryAddress?.state || "",
            country: initialData?.sale.deliveryAddress?.country || "",
            email: initialData?.sale.deliveryAddress?.email || "",
            phone: initialData?.sale.deliveryAddress?.phone || "",
          },
          isDeliveryNoteCreated:
            initialData?.sale.isDeliveryNoteCreated || false,
          notes: initialData?.sale.notes || "",
          quotationId: initialData?.sale.quotationId || null,
          isActive: initialData?.sale.isActive || true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        products: initialData?.products || [],
        customer: initialData?.customer ?? ({} as Customer),
        store: initialData?.store ?? ({} as Store),
        delivery: initialData?.delivery ?? ({} as Delivery),
        promissoryNote: initialData?.promissoryNote ?? ({} as PromissoryNote),
      };
    }
  } else if (mode === "create") {
    generatedInvoiceNumber = await generateInvoiceNumber();
    if (sourceQuotationId) {
      const fetchedQuotation = await getQuotationById(sourceQuotationId);
      if (!fetchedQuotation) notFound();
      sourceQuotation = fetchedQuotation;
    }
  }

  return (
    <SaleForm
      mode={mode === "duplicate" ? "create" : mode}
      initialData={initialData}
      sourceQuotation={sourceQuotation}
      customers={customers}
      products={products}
      taxes={taxes}
      stores={stores}
      inventoryStock={inventoryStock}
      quotations={allQuotations}
      sales={sales}
      generatedInvoiceNumber={generatedInvoiceNumber}
    />
  );
}
