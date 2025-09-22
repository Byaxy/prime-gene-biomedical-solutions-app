import { notFound } from "next/navigation";
import {
  generatePromissoryNoteRefNumber,
  getPromissoryNoteById,
  getPromissoryNotes,
} from "@/lib/actions/promissoryNote.actions";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getSaleById, getSales } from "@/lib/actions/sale.actions";

import PromissoryNoteForm from "@/components/forms/PromissoryNoteForm";
import {
  Customer,
  SaleWithRelations,
  PromissoryNoteWithRelations,
} from "@/types";

interface PromissoryNoteFormWrapperProps {
  mode: "create" | "edit";
  saleId?: string;
  promissoryNoteId?: string;
}

export default async function PromissoryNoteFormWrapper({
  mode,
  saleId,
  promissoryNoteId,
}: PromissoryNoteFormWrapperProps) {
  const [promissoryNotesData, customersData, salesData] = await Promise.all([
    getPromissoryNotes(0, 0, true),
    getCustomers(0, 0, true),
    getSales(0, 0, true),
  ]);

  const promissoryNotes: PromissoryNoteWithRelations[] =
    promissoryNotesData.documents;
  const customers: Customer[] = customersData.documents;
  const allSales: SaleWithRelations[] = salesData.documents;

  let initialData: PromissoryNoteWithRelations | undefined = undefined;
  let sourceSale: SaleWithRelations | undefined = undefined;
  let generatedPromissoryNoteRefNumber: string | undefined = undefined;

  // Specific data fetches based on mode
  if (mode === "edit") {
    if (!promissoryNoteId) notFound();
    const fetchedPromissoryNote = await getPromissoryNoteById(promissoryNoteId);
    if (!fetchedPromissoryNote) notFound();
    initialData = fetchedPromissoryNote;
  } else if (mode === "create") {
    generatedPromissoryNoteRefNumber = await generatePromissoryNoteRefNumber();
    if (saleId) {
      const sale = await getSaleById(saleId);
      if (!sale) notFound();
      sourceSale = sale;
    }
  }

  return (
    <PromissoryNoteForm
      mode={mode}
      initialData={initialData}
      promissoryNotes={promissoryNotes}
      customers={customers}
      sales={allSales}
      sourceSale={sourceSale}
      generatedPromissoryNoteRefNumber={generatedPromissoryNoteRefNumber}
    />
  );
}
