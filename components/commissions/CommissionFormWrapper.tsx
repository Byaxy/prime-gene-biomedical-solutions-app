import { notFound } from "next/navigation";
import { parseStringify } from "@/lib/utils";
import {
  CommissionWithRelations,
  Tax,
  SalesAgentWithRelations,
  SaleWithRelations,
} from "@/types";
import { getCommissionById } from "@/lib/actions/commission.actions";
import { getSales } from "@/lib/actions/sale.actions";
import { getSalesAgents } from "@/lib/actions/salesAgent.actions";
import { getTaxes } from "@/lib/actions/tax.actions";
import SalesCommissionForm from "../forms/SalesCommissionForm";

interface CommissionFormWrapperProps {
  mode: "create" | "edit";
  commissionId?: string;
}

export default async function CommissionFormWrapper({
  mode,
  commissionId,
}: CommissionFormWrapperProps) {
  let initialData: CommissionWithRelations | undefined;

  const [fetchedSales, fetchedSalesAgents, fetchedTaxes] = await Promise.all([
    getSales(0, 0, true),
    getSalesAgents(0, 0, true),
    getTaxes(0, 0, true),
  ]);

  const sales: SaleWithRelations[] = fetchedSales.documents;
  const salesAgents: SalesAgentWithRelations[] = fetchedSalesAgents.documents;
  const taxes: Tax[] = fetchedTaxes.documents;

  if (mode === "edit") {
    if (!commissionId) notFound();
    const fetchedCommission = await getCommissionById(commissionId);
    if (!fetchedCommission) notFound();
    initialData = parseStringify(fetchedCommission);
  }

  return (
    <SalesCommissionForm
      mode={mode}
      initialData={initialData}
      sales={sales}
      salesAgents={salesAgents}
      taxes={taxes}
    />
  );
}
