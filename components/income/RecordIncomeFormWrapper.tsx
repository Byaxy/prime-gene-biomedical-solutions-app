import { notFound } from "next/navigation";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getSales } from "@/lib/actions/sale.actions"; // Assuming this action can fetch by ID
import {
  generatePaymentReferenceNumber,
  getIncomeById,
} from "@/lib/actions/payments.actions"; // Assuming this fetches IncomeWithRelations

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
  let salesToDisplay: SaleWithRelations[] = [];
  let incomeCategories: IncomeCategoryWithRelations[] = [];
  let receivingAccounts: AccountWithRelations[] = [];

  let generatedReferenceNumber: string | undefined;

  const [
    fetchedCustomers,
    allSalesDocuments,
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

  const outstandingSales: SaleWithRelations[] = parseStringify(
    allSalesDocuments.documents.filter(
      (sale: SaleWithRelations) =>
        (sale.sale.paymentStatus === "pending" ||
          sale.sale.paymentStatus === "partial") &&
        sale.sale.isActive
    )
  );

  salesToDisplay = [...outstandingSales];

  if (mode === "edit") {
    if (!incomeId) notFound();
    const fetchedIncome = await getIncomeById(incomeId);
    if (!fetchedIncome) notFound();
    initialData = parseStringify(fetchedIncome);

    // If the income record is linked to a sale, ensure that specific sale is in `salesToDisplay`
    if (initialData?.payment?.saleId) {
      const linkedSaleId = initialData.payment.saleId;
      const isLinkedSaleInOutstanding = outstandingSales.some(
        (s) => s.sale.id === linkedSaleId
      );

      if (!isLinkedSaleInOutstanding) {
        // The linked sale is no longer outstanding (e.g., fully paid by THIS payment)
        // Find it in the *allSalesDocuments* to include it in the dropdown options
        const previouslyLinkedSale = allSalesDocuments.documents.find(
          (sale: SaleWithRelations) => sale.sale.id === linkedSaleId
        );
        if (previouslyLinkedSale) {
          salesToDisplay.unshift(parseStringify(previouslyLinkedSale));
        }
      }
    }
  } else if (mode === "create") {
    generatedReferenceNumber = await generatePaymentReferenceNumber();

    if (sourceSaleId) {
      // For create mode with sourceSaleId, find it within the outstanding sales
      const sourceSale = outstandingSales.find(
        (s) => s.sale.id === sourceSaleId
      );
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
          balanceDueAfterPayment: 0,
          paymentMethod: PaymentMethod.Cash,
          notes: `Payment for Invoice ${sourceSale.sale.invoiceNumber}`,
          attachments: [],
          checkNumber: null,
          checkBankName: null,
          checkDate: null,
          isReceiptGenerated: false,
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

  // Ensure unique sales in salesToDisplay if a sale was added (e.g., for edit mode)
  // This step is important if a sale might exist in both outstandingSales and also added specifically
  salesToDisplay = Array.from(
    new Map(salesToDisplay.map((item) => [item.sale.id, item])).values()
  );

  return (
    <RecordIncomeForm
      mode={mode}
      initialData={initialData}
      customers={customers}
      sales={salesToDisplay}
      incomeCategories={incomeCategories}
      receivingAccounts={receivingAccounts}
      generatedReferenceNumber={generatedReferenceNumber}
    />
  );
}
