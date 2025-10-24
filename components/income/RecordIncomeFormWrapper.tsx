import { notFound } from "next/navigation";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getSales } from "@/lib/actions/sale.actions";

import { parseStringify } from "@/lib/utils";
import {
  Customer,
  SaleWithRelations,
  IncomeCategoryWithRelations,
  AccountWithRelations,
  IncomeWithRelations,
  PaymentMethod,
} from "@/types";
import { getIncomeCategories } from "@/lib/actions/incomeCategories.actions";
import { getAccounts } from "@/lib/actions/accounting.actions";
import {
  generatePaymentReferenceNumber,
  getIncomeById,
} from "@/lib/actions/payments.actions";
import { RecordIncomeForm } from "../forms/RecordIncomeForm";

interface RecordIncomeFormWrapperProps {
  mode: "create" | "edit";
  incomeId?: string;
  sourceSaleId?: string;
}

export default async function RecordIncomeFormWrapper({
  mode,
  incomeId,
  sourceSaleId,
}: RecordIncomeFormWrapperProps) {
  let initialData: IncomeWithRelations | undefined;
  let customers: Customer[] = [];
  let sales: SaleWithRelations[] = [];
  let incomeCategories: IncomeCategoryWithRelations[] = [];
  let receivingAccounts: AccountWithRelations[] = [];

  let generatedReferenceNumber: string | undefined;

  const [
    fetchedCustomers,
    fetchedSales,
    fetchedIncomeCategories,
    fetchedAccounts,
  ] = await Promise.all([
    getCustomers(0, 0, true),
    getSales(0, 0, true),
    getIncomeCategories(0, 0, true),
    getAccounts(0, 0, true),
  ]);

  customers = parseStringify(fetchedCustomers.documents);
  incomeCategories = parseStringify(fetchedIncomeCategories.documents);

  // Filter to only include active accounts
  receivingAccounts = parseStringify(
    fetchedAccounts.documents.filter(
      (acc: AccountWithRelations) => acc.account.isActive
    )
  );

  // Filter sales to show only those with pending/partial payment statuses
  sales = parseStringify(
    fetchedSales.documents.filter(
      (sale: SaleWithRelations) =>
        (sale.sale.paymentStatus === "pending" ||
          sale.sale.paymentStatus === "partial") &&
        sale.sale.isActive
    )
  );

  if (mode === "edit") {
    if (!incomeId) notFound();
    const fetchedIncome = await getIncomeById(incomeId);
    if (!fetchedIncome) notFound();
    initialData = parseStringify(fetchedIncome);
  } else if (mode === "create") {
    generatedReferenceNumber = await generatePaymentReferenceNumber();

    if (sourceSaleId) {
      const sourceSale = sales.find((s) => s.sale.id === sourceSaleId);
      if (!sourceSale) notFound();

      // Create a mock initialData for pre-population
      initialData = {
        payment: {
          id: "",
          paymentRefNumber: generatedReferenceNumber || "",
          paymentDate: new Date(),
          customerId: sourceSale.sale.customerId,
          saleId: sourceSale.sale.id,
          incomeCategoryId: null,
          receivingAccountId: "",
          amountReceived:
            parseFloat(String(sourceSale.sale.totalAmount)) -
            parseFloat(String(sourceSale.sale.amountPaid)),
          paymentMethod: PaymentMethod.Cash,
          notes: `Payment for Invoice ${sourceSale.sale.invoiceNumber}`,
          attachments: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        customer: sourceSale.customer,
        sale: sourceSale.sale,
        incomeCategory: null,
        receivingAccount: null,
      } as IncomeWithRelations;
    }
  }

  return (
    <RecordIncomeForm
      mode={mode}
      initialData={initialData}
      customers={customers}
      sales={sales}
      incomeCategories={incomeCategories}
      receivingAccounts={receivingAccounts}
      generatedReferenceNumber={generatedReferenceNumber}
    />
  );
}
