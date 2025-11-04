// src/components/receipts/ReceiptFormWrapper.tsx
import { notFound } from "next/navigation";
import { parseStringify } from "@/lib/utils";
import {
  Customer,
  IncomeWithRelations,
  SaleWithRelations,
  IncomeCategoryWithRelations,
  ReceiptWithRelations,
} from "@/types";
import { getCustomers } from "@/lib/actions/customer.actions";
import { getSales } from "@/lib/actions/sale.actions";
import { getIncomeCategories } from "@/lib/actions/incomeCategories.actions";
import {
  generateReceiptNumber,
  getReceiptById,
} from "@/lib/actions/receipts.actions";
import { ReceiptForm } from "../forms/ReceiptForm";
import { getIncome } from "@/lib/actions/payments.actions";

interface ReceiptFormWrapperProps {
  mode: "create" | "edit";
  receiptId?: string;
  sourcePaymentReceivedId?: string;
}

export default async function ReceiptFormWrapper({
  mode,
  receiptId,
  sourcePaymentReceivedId,
}: ReceiptFormWrapperProps) {
  let initialData: ReceiptWithRelations | undefined;
  let customers: Customer[] = [];
  let availablePayments: IncomeWithRelations[] = []; // Type changed
  let allSales: SaleWithRelations[] = []; // To look up sales details
  let incomeCategories: IncomeCategoryWithRelations[] = []; // To look up category details

  let generatedReceiptNumber: string | undefined;

  // Fetch all necessary data concurrently
  const [
    fetchedCustomers,
    fetchedPayments,
    fetchedSales,
    fetchedIncomeCategories,
  ] = await Promise.all([
    getCustomers(0, 0, true),
    getIncome(0, 0, true),
    getSales(0, 0, true),
    getIncomeCategories(0, 0, true),
  ]);

  customers = parseStringify(fetchedCustomers.documents);
  availablePayments = parseStringify(fetchedPayments.documents);
  allSales = parseStringify(fetchedSales.documents);
  incomeCategories = parseStringify(fetchedIncomeCategories.documents);

  if (mode === "edit") {
    if (!receiptId) notFound();
    const fetchedReceipt = await getReceiptById(receiptId);
    if (!fetchedReceipt) notFound();
    initialData = parseStringify(fetchedReceipt);
  } else if (mode === "create") {
    generatedReceiptNumber = await generateReceiptNumber();

    if (sourcePaymentReceivedId) {
      const sourcePaymentData = availablePayments.find(
        (p) => p.payment.id === sourcePaymentReceivedId
      );
      if (!sourcePaymentData) notFound();

      const sourcePayment = sourcePaymentData.payment;
      const linkedSale = sourcePaymentData.sale;

      initialData = {
        receipt: {
          id: "",
          receiptNumber: generatedReceiptNumber,
          receiptDate: new Date(),
          customerId: sourcePayment.customerId,
          totalAmountReceived: sourcePayment.amountReceived,
          totalAmountDue: sourcePayment.amountReceived,
          totalBalanceDue: 0,
          attachments: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        customer:
          customers.find((c) => c.id === sourcePayment.customerId) || null,
        items: [
          {
            receiptItem: {
              id: "",
              receiptId: "",
              paymentReceivedId: sourcePayment.id,
              invoiceNumber: linkedSale?.invoiceNumber || null,
              invoiceDate: linkedSale?.saleDate
                ? new Date(linkedSale.saleDate)
                : null,
              amountDue: sourcePayment.amountReceived,
              amountReceived: sourcePayment.amountReceived,
              balanceDue: 0,
              paymentMethod: sourcePayment.paymentMethod,
              saleId: sourcePayment.saleId || null,
              incomeCategoryId: sourcePayment.incomeCategoryId || null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            paymentReceived: sourcePayment,
            sale: linkedSale || null,
            incomeCategory: sourcePaymentData.incomeCategory || null,
            receivingAccount: sourcePaymentData.receivingAccount || null,
          },
        ],
      } as ReceiptWithRelations;
    }
  }

  return (
    <ReceiptForm
      mode={mode}
      initialData={initialData}
      customers={customers}
      availablePayments={availablePayments}
      sales={allSales}
      incomeCategories={incomeCategories}
      generatedReceiptNumber={generatedReceiptNumber}
    />
  );
}
