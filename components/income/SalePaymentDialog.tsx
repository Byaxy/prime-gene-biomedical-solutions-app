"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Attachment, IncomeTrackerRecord } from "@/types";
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
import { useIncome } from "@/hooks/useIncome";

interface SalePaymentDialogProps {
  mode: "view" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeTrackerData: IncomeTrackerRecord;
}

const SalePaymentDialog: React.FC<SalePaymentDialogProps> = ({
  mode,
  open,
  onOpenChange,
  incomeTrackerData,
}) => {
  const { softDeleteIncome, isSoftDeletingIncome, useSingleIncome } =
    useIncome();

  // Fetch the full Sale Payment (Payment Received) details if mode is 'view'
  const {
    data: paymentReceived,
    isLoading: isLoadingFullSalePayment,
    error: singlePaymentError,
  } = useSingleIncome(incomeTrackerData.paymentId || "");

  const handleDelete = async () => {
    try {
      if (paymentReceived?.payment?.id) {
        await softDeleteIncome(paymentReceived.payment.id, {
          onSuccess: () => {
            toast.success("Sale Payment record deactivated successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deactivating sale payment:", error);
            toast.error(error.message || "Failed to deactivate sale payment.");
          },
        });
      } else {
        throw new Error("Sale Payment ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };

  const handleDownloadAttachments = () => {
    if (
      paymentReceived?.payment?.attachments &&
      paymentReceived.payment.attachments.length > 0
    ) {
      paymentReceived.payment.attachments.forEach((attachment: Attachment) => {
        const link = document.createElement("a");
        link.href = attachment.url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      toast.success("Downloading attachments...");
    } else {
      toast.error("No attachments to download.");
    }
  };

  if (isLoadingFullSalePayment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl bg-light-200">
          <DialogHeader>
            <DialogTitle>Loading Sale Payment Details...</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">Loading data...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (singlePaymentError || !paymentReceived?.payment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl bg-light-200">
          <DialogHeader>
            <DialogTitle>Sale Payment Details Not Found</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-red-500">
            Could not load details for this sale payment.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Use the fullSalePayment for display

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-7xl bg-light-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onInteractOutside={(e) => {
          if (e.target instanceof Element) {
            if (
              e.target.closest('[role="listbox"]') ||
              e.target.closest("[data-radix-select-viewport]") ||
              e.target.closest("[data-radix-popper-content]")
            ) {
              e.preventDefault();
              return;
            }
          }

          const event = e.detail.originalEvent;
          if (event instanceof PointerEvent) {
            event.stopPropagation();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            {mode === "delete"
              ? "Deactivate Sale Payment"
              : `Sale Payment: ${paymentReceived.payment.paymentRefNumber}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {mode === "delete"
              ? "Are you sure you want to deactivate this sale payment record? This will revert its impact on sales balances and financial accounts."
              : `Details for sale payment reference ${paymentReceived.payment.paymentRefNumber}.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-6 text-dark-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Reference Number:</p>
                <p>{paymentReceived.payment.paymentRefNumber}</p>
              </div>
              <div>
                <p className="font-semibold">Payment Date:</p>
                <p>
                  {formatDateTime(paymentReceived.payment.paymentDate).dateOnly}
                </p>
              </div>
              <div>
                <p className="font-semibold">Customer:</p>
                <p>{paymentReceived.customer?.name || "-"}</p>
              </div>
              <div>
                <p className="font-semibold">Total Payment Amount:</p>
                <p className="font-bold">
                  <FormatNumber
                    value={paymentReceived.payment.amountReceived}
                  />
                </p>
              </div>
            </div>

            {/* Sales Paid */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-blue-800">Sales Paid</h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Amount Applied</TableHead>
                    <TableHead>Original Total</TableHead>
                    <TableHead>New Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow key={paymentReceived.payment.id}>
                    <TableCell>
                      {paymentReceived.sale?.invoiceNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={paymentReceived.payment.amountReceived}
                      />
                    </TableCell>
                    <TableCell>
                      <FormatNumber
                        value={paymentReceived.sale?.totalAmount || 0}
                      />
                    </TableCell>
                    <TableCell>
                      {/* Calculate remaining balance for this specific sale */}
                      <FormatNumber
                        value={
                          (paymentReceived.sale?.totalAmount || 0) -
                          (parseFloat(
                            paymentReceived.sale?.amountPaid || "0"
                          ) || 0)
                        }
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <p className="font-semibold">General Comments:</p>
              <p>{paymentReceived.payment.generalComments || "-"}</p>
            </div>

            {paymentReceived.payment.attachments &&
              paymentReceived.payment.attachments.length > 0 && (
                <div>
                  <p className="font-semibold">
                    Attachments ({paymentReceived.payment.attachments.length}):
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {paymentReceived.payment.attachments.map(
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
              <p>{paymentReceived.user?.name || "-"}</p>
            </div>
            <div>
              <p className="font-semibold">Created At:</p>
              <p>
                {formatDateTime(paymentReceived.payment.createdAt).dateTime}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-4">
          {mode === "view" && (
            <>
              {paymentReceived.attachments &&
                paymentReceived.attachments.length > 0 && (
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
                disabled={isSoftDeletingIncome}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSoftDeletingIncome}
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

export default SalePaymentDialog;
