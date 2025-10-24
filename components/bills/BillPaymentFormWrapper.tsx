import { notFound } from "next/navigation";
import { getVendors } from "@/lib/actions/vendor.actions";
import { getPurchases } from "@/lib/actions/purchase.actions";
import { getAccounts } from "@/lib/actions/accounting.actions";
import { parseStringify } from "@/lib/utils";
import {
  Vendor,
  PurchaseWithRelations,
  AccountWithRelations,
  AccompanyingExpenseTypeWithRelations,
  BillPaymentWithRelations,
} from "@/types";
import { getAccompanyingExpenseTypes } from "@/lib/actions/accompanyingExpenses.actions";
import { BillPaymentForm } from "../forms/BillPaymentForm";
import {
  generateBillReferenceNumber,
  getBillPaymentById,
} from "@/lib/actions/bills.actions";

interface BillPaymentFormWrapperProps {
  mode: "create" | "edit";
  billPaymentId?: string;
}

export default async function BillPaymentFormWrapper({
  mode,
  billPaymentId,
}: BillPaymentFormWrapperProps) {
  let initialData: BillPaymentWithRelations | undefined;
  let vendors: Vendor[] = [];
  let outstandingPurchases: PurchaseWithRelations[] = [];
  let payingAccounts: AccountWithRelations[] = [];
  let accompanyingExpenseTypes: AccompanyingExpenseTypeWithRelations[] = [];
  let generatedBillReferenceNumber: string | undefined = undefined;

  try {
    const [
      fetchedVendors,
      fetchedPurchases,
      fetchedAccounts,
      fetchedAccompanyingTypes,
    ] = await Promise.all([
      getVendors(0, 0, true),
      getPurchases(0, 0, true),
      getAccounts(0, 0, true),
      getAccompanyingExpenseTypes(0, 0, true),
    ]);

    vendors = fetchedVendors.documents;

    // Filter purchases to show only those with pending/partial payment statuses
    outstandingPurchases = fetchedPurchases.documents.filter(
      (purchase: PurchaseWithRelations) =>
        (purchase.purchase.paymentStatus === "pending" ||
          purchase.purchase.paymentStatus === "partial") &&
        purchase.purchase.isActive // Also ensure purchase itself is active
    );

    // Filter to only include active accounts
    payingAccounts = fetchedAccounts.documents.filter(
      (acc: AccountWithRelations) => acc.account.isActive
    );

    accompanyingExpenseTypes = fetchedAccompanyingTypes.documents;

    if (mode === "edit") {
      if (!billPaymentId) notFound();
      const fetchedBillPayment = await getBillPaymentById(billPaymentId);
      if (!fetchedBillPayment) notFound();
      initialData = parseStringify(fetchedBillPayment);
    } else if (mode === "create") {
      generatedBillReferenceNumber = await generateBillReferenceNumber();
    }
  } catch (error) {
    console.error("Error fetching data for BillPaymentForm:", error);
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-red-500 text-lg">
          Error loading Bill Payment form data. Please try again.
        </p>
      </div>
    );
  }

  return (
    <BillPaymentForm
      mode={mode}
      initialData={initialData}
      vendors={vendors}
      outstandingPurchases={outstandingPurchases}
      payingAccounts={payingAccounts}
      accompanyingExpenseTypes={accompanyingExpenseTypes}
      generatedBillReferenceNumber={generatedBillReferenceNumber}
    />
  );
}
