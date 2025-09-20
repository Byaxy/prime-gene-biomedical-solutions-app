import { notFound } from "next/navigation";
import {
  generateQuotationNumber,
  getQuotations,
  getQuotationById,
} from "@/lib/actions/quotation.actions";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getProducts } from "@/lib/actions/product.actions";
import { getTaxes } from "@/lib/actions/tax.actions";
import { getInventoryStock } from "@/lib/actions/inventoryStock.actions";

import QuotationForm from "@/components/forms/QuotationForm";
import {
  Customer,
  ProductWithRelations,
  QuotationWithRelations,
  Tax,
  InventoryStockWithRelations,
} from "@/types";

interface QuotationFormWrapperProps {
  mode: "create" | "edit";
  quotationId?: string;
}

export default async function QuotationFormWrapper({
  mode,
  quotationId,
}: QuotationFormWrapperProps) {
  const [
    customersData,
    productsData,
    taxesData,
    quotationsData,
    inventoryStockData,
  ] = await Promise.all([
    getCustomers(0, 0, true),
    getProducts(0, 0, true, { isActive: "true" }),
    getTaxes(0, 0, true),
    getQuotations(0, 0, true),
    getInventoryStock(0, 0, true),
  ]);

  const customers: Customer[] = customersData.documents;
  const products: ProductWithRelations[] = productsData.documents;
  const taxes: Tax[] = taxesData.documents;
  const allQuotations: QuotationWithRelations[] = quotationsData.documents;
  const inventoryStock: InventoryStockWithRelations[] =
    inventoryStockData.documents;

  let initialData: QuotationWithRelations | undefined = undefined;
  let generatedQuotationNumber: string | undefined = undefined;

  if (mode === "edit") {
    if (!quotationId) notFound();
    const fetchedQuotation = await getQuotationById(quotationId);
    if (!fetchedQuotation) notFound();
    initialData = fetchedQuotation;
  } else if (mode === "create") {
    generatedQuotationNumber = await generateQuotationNumber();
  }

  return (
    <QuotationForm
      mode={mode}
      initialData={initialData}
      customers={customers}
      products={products}
      taxes={taxes}
      quotations={allQuotations}
      inventoryStock={inventoryStock}
      generatedQuotationNumber={generatedQuotationNumber}
    />
  );
}
