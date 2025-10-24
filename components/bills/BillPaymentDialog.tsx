"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Attachment,
  BillPaymentAccompanyingExpenseWithRelations,
  BillPaymentAccountAllocationWithRelations,
  BillPaymentItemWithRelations,
  BillTrackerData,
} from "@/types";
import { useBillPayments } from "@/hooks/useBillPayments";
import toast from "react-hot-toast";
import { formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { FileText, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BillPaymentDialogProps {
  mode: "view" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billTrackerData: BillTrackerData;
}

const BillPaymentDialog: React.FC<BillPaymentDialogProps> = ({
  mode,
  open,
  onOpenChange,
  billTrackerData,
}) => {
  const {
    softDeleteBillPayment,
    isSoftDeletingBillPayment,
    useSingleBillPayment,
  } = useBillPayments();

  // Fetch the full BillPayment details if mode is 'view'
  const { data: fullBillPayment, isLoading: isLoadingFullBillPayment } =
    useSingleBillPayment(billTrackerData.billPaymentId || "");

  const handleDelete = async () => {
    try {
      if (fullBillPayment?.billPayment?.id) {
        await softDeleteBillPayment(fullBillPayment.billPayment.id, {
          onSuccess: () => {
            toast.success("Bill Payment record deactivated successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deactivating bill payment:", error);
            toast.error(error.message || "Failed to deactivate bill payment.");
          },
        });
      } else {
        throw new Error("Bill Payment ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };

  const handleDownloadAttachments = () => {
    if (
      fullBillPayment?.billPayment?.attachments &&
      fullBillPayment.billPayment.attachments.length > 0
    ) {
      fullBillPayment.billPayment.attachments.forEach(
        (attachment: Attachment) => {
          const link = document.createElement("a");
          link.href = attachment.url;
          link.download = attachment.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      );
      toast.success("Downloading attachments...");
    } else {
      toast.error("No attachments to download.");
    }
  };

  if (isLoadingFullBillPayment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl bg-light-200">
          <DialogHeader>
            <DialogTitle>Loading Bill Payment Details...</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">Loading data...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!fullBillPayment?.billPayment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl bg-light-200">
          <DialogHeader>
            <DialogTitle>Bill Payment Details Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-red-500">
            Could not load details for this bill payment.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl bg-light-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            {mode === "delete"
              ? "Deactivate Bill Payment"
              : `Bill Payment: ${fullBillPayment.billPayment.billReferenceNo}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {mode === "delete"
              ? "Are you sure you want to deactivate this bill payment record? This will revert its impact on purchase balances and financial accounts."
              : `Details for bill payment reference ${fullBillPayment.billPayment.billReferenceNo}.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-6 text-dark-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Reference Number:</p>
                <p>{fullBillPayment.billPayment.billReferenceNo}</p>
              </div>
              <div>
                <p className="font-semibold">Payment Date:</p>
                <p>
                  {
                    formatDateTime(fullBillPayment.billPayment.paymentDate)
                      .dateOnly
                  }
                </p>
              </div>
              <div>
                <p className="font-semibold">Vendor:</p>
                <p>{fullBillPayment.vendor?.name || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Total Payment Amount:</p>
                <p className="font-bold">
                  <FormatNumber
                    value={fullBillPayment.billPayment.totalPaymentAmount}
                  />
                </p>
              </div>
            </div>

            {/* Purchases Paid */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-blue-800">
                Purchases Paid
              </h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead>Purchase #</TableHead>
                    <TableHead>Vendor Inv. #</TableHead>
                    <TableHead>Amount Applied</TableHead>
                    <TableHead>Original Total</TableHead>
                    <TableHead>New Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fullBillPayment.items?.map(
                    (item: BillPaymentItemWithRelations, index: number) => (
                      <TableRow key={item.item.id || index}>
                        <TableCell>
                          {item.purchase?.purchaseNumber || "-"}
                        </TableCell>
                        <TableCell>
                          {item.purchase?.vendorInvoiceNumber || "-"}
                        </TableCell>
                        <TableCell>
                          <FormatNumber value={item.item.amountApplied} />
                        </TableCell>
                        <TableCell>
                          <FormatNumber
                            value={item.purchase?.totalAmount || 0}
                          />
                        </TableCell>
                        <TableCell>
                          <FormatNumber
                            value={
                              (item.purchase?.totalAmount || 0) -
                              (item.purchase?.amountPaid || 0) +
                              (item.item.amountApplied || 0)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Accompanying Expenses */}
            {fullBillPayment.accompanyingExpenses &&
              fullBillPayment.accompanyingExpenses.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-blue-800">
                    Payment Accompanying Expenses
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead>Expense Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payee</TableHead>
                        <TableHead>Comments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fullBillPayment.accompanyingExpenses.map(
                        (
                          exp: BillPaymentAccompanyingExpenseWithRelations,
                          index: number
                        ) => (
                          <TableRow key={exp.expense.id || index}>
                            <TableCell>
                              {exp.accompanyingType?.name || "-"}
                            </TableCell>
                            <TableCell>
                              <FormatNumber value={exp.expense.amount} />
                            </TableCell>
                            <TableCell>{exp.expense.payee || "-"}</TableCell>
                            <TableCell>{exp.expense.comments || "-"}</TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

            {/* Payment Allocations */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-blue-800">
                Payment From Accounts
              </h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead>Account Name</TableHead>
                    <TableHead>Account #</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fullBillPayment.payingAccounts?.map(
                    (
                      alloc: BillPaymentAccountAllocationWithRelations,
                      index: number
                    ) => (
                      <TableRow key={alloc.allocation.id || index}>
                        <TableCell>{alloc.account?.name || "-"}</TableCell>
                        <TableCell>
                          {alloc.account?.accountNumber || "-"}
                        </TableCell>
                        <TableCell>
                          <FormatNumber
                            value={alloc.allocation.amountPaidFromAccount}
                          />
                        </TableCell>
                        <TableCell>
                          <FormatNumber
                            value={
                              (alloc.account?.currentBalance || 0) -
                              (alloc.allocation.amountPaidFromAccount || 0)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>

            <div>
              <p className="font-semibold">General Comments:</p>
              <p>{fullBillPayment.billPayment.generalComments || "-"}</p>
            </div>

            {fullBillPayment.billPayment.attachments &&
              fullBillPayment.billPayment.attachments.length > 0 && (
                <div>
                  <p className="font-semibold">
                    Attachments (
                    {fullBillPayment.billPayment.attachments.length}):
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {fullBillPayment.billPayment.attachments.map(
                      (file: Attachment, index: number) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline text-sm bg-gray-100 p-2 rounded-md"
                        >
                          <FileText className="h-4 w-4" /> {file.name}
                        </a>
                      )
                    )}
                  </div>
                </div>
              )}
            <div>
              <p className="font-semibold">Recorded By:</p>
              <p>{fullBillPayment.user?.name || "-"}</p>
            </div>
            <div>
              <p className="font-semibold">Created At:</p>
              <p>
                {formatDateTime(fullBillPayment.billPayment.createdAt).dateTime}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-4">
          {mode === "view" && (
            <>
              {fullBillPayment.billPayment.attachments &&
                fullBillPayment.billPayment.attachments.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadAttachments}
                    className="shad-gray-btn"
                  >
                    <Download className="h-5 w-5 mr-2" /> Attachments
                  </Button>
                )}
            </>
          )}
          {mode === "delete" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSoftDeletingBillPayment}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSoftDeletingBillPayment}
                className="shad-danger-btn"
              >
                Deactivate
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillPaymentDialog;
