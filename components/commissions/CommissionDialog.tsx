/* eslint-disable @typescript-eslint/no-explicit-any */
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
  CommissionWithRelations,
  CommissionPaymentStatus,
  CommissionStatus,
} from "@/types";
import toast from "react-hot-toast";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCommissions } from "@/hooks/useCommissions";
import { useAuth } from "@/hooks/useAuth";

interface CommissionDialogProps {
  mode: "view" | "status" | "delete";
  open: boolean;
  onOpenChange: () => void;
  commission: CommissionWithRelations;
}

const CommissionDialog: React.FC<CommissionDialogProps> = ({
  mode,
  open,
  onOpenChange,
  commission,
}) => {
  const { softDeleteCommission, isSoftDeletingCommission } = useCommissions();
  const { user } = useAuth();

  const handleDelete = async () => {
    try {
      if (commission?.commission?.id && user?.id) {
        await softDeleteCommission(
          { id: commission.commission.id },
          {
            onSuccess: () => {
              toast.success("Commission deleted successfully.");
              onOpenChange();
            },
            onError: (error) => {
              console.error("Error deactivating commission:", error);
              toast.error(error.message || "Failed to delete commission.");
            },
          }
        );
      } else {
        throw new Error("Commission ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };

  if (!commission?.commission) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-6xl bg-light-200 overflow-y-auto max-h-[90vh]",
          mode === "view" && "sm:max-w-[90rem]"
        )}
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
              ? "Delete Commission"
              : `Commission Details: ${commission.commission.commissionRefNumber}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {mode === "delete"
              ? "Are you sure you want to delete this commission? This action will prevent further use and any pending payouts will be cancelled."
              : `Details for Commission (${commission.commission.commissionRefNumber})`}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-blue-800">
              <div className="space-y-2">
                <p className="font-semibold">Ref. Number:</p>
                <p>{commission.commission.commissionRefNumber}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Date:</p>
                <p>
                  {
                    formatDateTime(commission.commission.commissionDate)
                      .dateOnly
                  }
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Amount Received (Net Sales):</p>
                <p>
                  <FormatNumber
                    value={commission.commission.totalAmountReceived}
                  />
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Additions:</p>
                <p>
                  <FormatNumber value={commission.commission.totalAdditions} />
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Deductions:</p>
                <p>
                  <FormatNumber value={commission.commission.totalDeductions} />
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">WHT Amount:</p>
                <p>
                  <FormatNumber
                    value={commission.commission.totalWithholdingTaxAmount}
                  />
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Total Commission Payable:</p>
                <p>
                  <FormatNumber
                    value={commission.commission.totalCommissionPayable}
                  />
                </p>
              </div>
              <div className="col-span-3 space-y-2">
                <p className="font-semibold">Internal Notes:</p>
                <p>{commission.commission.notes || "N/A"}</p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Status:</p>
                <p>
                  <span
                    className={cn(
                      " capitalize",
                      {
                        "bg-yellow-500":
                          commission.commission.status ===
                          CommissionStatus.PendingApproval,
                        "bg-blue-600":
                          commission.commission.status ===
                          CommissionStatus.Approved,
                        "bg-green-500":
                          commission.commission.status ===
                          CommissionStatus.Processed,
                        "bg-red-600":
                          commission.commission.status ===
                          CommissionStatus.Cancelled,
                      },
                      "text-white px-3 py-1 rounded-xl"
                    )}
                  >
                    {commission.commission.status.split("_").join(" ")}
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Payment Status:</p>
                <p>
                  <span
                    className={cn(
                      " capitalize",
                      {
                        "bg-yellow-500":
                          commission.commission.paymentStatus ===
                          CommissionPaymentStatus.Pending,
                        "bg-orange-500":
                          commission.commission.paymentStatus ===
                          CommissionPaymentStatus.Partial,
                        "bg-green-500":
                          commission.commission.paymentStatus ===
                          CommissionPaymentStatus.Paid,
                        "bg-red-600":
                          commission.commission.paymentStatus ===
                          CommissionPaymentStatus.Cancelled,
                      },
                      "text-white px-3 py-1 rounded-xl"
                    )}
                  >
                    {commission.commission.paymentStatus.split("_").join(" ")}
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Created At:</p>
                <p>
                  {formatDateTime(commission.commission.createdAt).dateTime}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-6">
              <h3 className="text-lg font-semibold text-blue-800">
                Related Sales
              </h3>
              <Table className="shad-table">
                <TableHeader className="bg-blue-800 text-white">
                  <TableRow>
                    <TableHead className="w-[5%] text-center">#</TableHead>
                    <TableHead className="w-[10%]">Invoice No.</TableHead>
                    <TableHead className="w-[10%]">Amount Recv.</TableHead>
                    <TableHead className="w-[8%]">Comm. Rate</TableHead>
                    <TableHead className="w-[7%]">WHT Rate</TableHead>
                    <TableHead className="w-[8%]">WHT Amount</TableHead>
                    <TableHead className="w-[8%]">Gross Comm.</TableHead>
                    <TableHead className="w-[8%]">Additions</TableHead>
                    <TableHead className="w-[8%]">Deductions</TableHead>
                    <TableHead className="w-[8%]">Net Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="w-full bg-white text-blue-800">
                  {commission.commissionSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        {` No Sales Found.`}
                      </TableCell>
                    </TableRow>
                  )}
                  {commission.commissionSales.map((entry, index) => (
                    <TableRow
                      key={entry.commissionSale.id}
                      className={cn("w-full", {
                        "bg-blue-50": index % 2 === 1,
                      })}
                    >
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>{entry.sale.invoiceNumber}</TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.amountReceived}
                        />
                      </TableCell>
                      <TableCell>
                        {entry.commissionSale.commissionRate}%
                      </TableCell>
                      <TableCell>
                        {entry.commissionSale.withholdingTaxRate}%
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.withholdingTaxAmount || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.grossCommission || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.additions || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.deductions || 0}
                        />
                      </TableCell>
                      <TableCell>
                        <FormatNumber
                          value={entry.commissionSale.commissionPayable || 0}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  {commission.commissionSales.length > 0 && (
                    <TableRow className="font-bold bg-blue-100">
                      <TableCell colSpan={9} className="text-right">
                        Total Commission Payable:
                      </TableCell>
                      <TableCell className="text-left">
                        <FormatNumber
                          value={commission.commission.totalCommissionPayable}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-4 pt-5">
              <h3 className="text-lg font-semibold text-blue-800">
                Recipients
              </h3>
              <Table className="shad-table">
                <TableHeader className="bg-blue-800 text-white">
                  <TableRow>
                    <TableHead className="w-[5%] text-center">#</TableHead>
                    <TableHead className="w-[30%]">Sales Agent</TableHead>
                    <TableHead className="w-[20%]">Amount</TableHead>
                    <TableHead className="w-[25%]">Payment Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="w-full bg-white text-blue-800">
                  {commission.recipients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No recipients assigned.
                      </TableCell>
                    </TableRow>
                  )}
                  {commission.recipients.map((rec, index) => (
                    <TableRow key={rec.recipient.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>{rec.salesAgent.name}</TableCell>
                      <TableCell>
                        <FormatNumber value={rec.recipient.amount} />
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-xl px-3 py-1 text-white capitalize",
                            {
                              "bg-yellow-500":
                                rec.recipient.paymentStatus ===
                                CommissionPaymentStatus.Pending,
                              "bg-green-500":
                                rec.recipient.paymentStatus ===
                                CommissionPaymentStatus.Paid,
                              "bg-red-600":
                                rec.recipient.paymentStatus ===
                                CommissionPaymentStatus.Cancelled,
                            }
                          )}
                        >
                          {rec.recipient.paymentStatus}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {mode === "delete" && (
          <div className="flex justify-end gap-4 mt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSoftDeletingCommission}
              className="shad-danger-btn"
            >
              Delete Commission
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommissionDialog;
