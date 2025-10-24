"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IncomeWithRelations } from "@/types";
import { useIncome } from "@/hooks/useIncome";
import toast from "react-hot-toast";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { FileText, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface IncomeDialogProps {
  mode: "view" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: IncomeWithRelations;
}

const IncomeDialog: React.FC<IncomeDialogProps> = ({
  mode,
  open,
  onOpenChange,
  income,
}) => {
  const { softDeleteIncome, isSoftDeletingIncome } = useIncome();
  const { user } = useAuth();

  const handleDelete = async () => {
    try {
      if (income?.payment?.id && user?.id) {
        await softDeleteIncome(
          { id: income.payment.id, userId: user.id },
          {
            onSuccess: () => {
              toast.success("Income record deactivated successfully.");
              onOpenChange(false);
            },
            onError: (error) => {
              console.error("Error deactivating income record:", error);
              toast.error(
                error.message || "Failed to deactivate income record."
              );
            },
          }
        );
      } else {
        throw new Error("Income record ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };

  const handleDownloadAttachments = () => {
    if (income.payment.attachments && income.payment.attachments.length > 0) {
      income.payment.attachments.forEach((attachment) => {
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

  if (!income?.payment) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-light-200">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-800">
            {mode === "delete"
              ? "Deactivate Income Record"
              : `Income Details: ${income.payment.paymentRefNumber}`}
          </DialogTitle>
          <DialogDescription className="text-dark-500">
            {mode === "delete"
              ? "Are you sure you want to deactivate this income record? This action will prevent further use but will preserve historical data."
              : `Details for income reference ${income.payment.paymentRefNumber}.`}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-dark-600">
            <div>
              <p className="font-semibold">Reference Number:</p>
              <p>{income.payment.paymentRefNumber}</p>
            </div>
            <div>
              <p className="font-semibold">Date:</p>
              <p>{formatDateTime(income.payment.paymentDate).dateOnly}</p>
            </div>
            <div>
              <p className="font-semibold">Amount:</p>
              <p>
                <FormatNumber value={income.payment.amountReceived} />
              </p>
            </div>
            <div>
              <p className="font-semibold">Method:</p>
              <p className="capitalize">
                {income.payment.paymentMethod.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="font-semibold">Customer:</p>
              <p>{income.customer?.name || "-"}</p>
            </div>
            <div>
              <p className="font-semibold">Linked Sale:</p>
              <p>{income.sale?.invoiceNumber || "-"}</p>
            </div>
            <div>
              <p className="font-semibold">Category:</p>
              <p>{income.incomeCategory?.name || "-"}</p>
            </div>
            <div>
              <p className="font-semibold">Receiving Account:</p>
              <p>
                {income.receivingAccount?.name || "-"} (
                {income.receivingAccount?.accountNumber || "N/A"})
              </p>
            </div>
            <div className="col-span-2">
              <p className="font-semibold">Notes:</p>
              <p>{income.payment.notes || "-"}</p>
            </div>
            {income.payment.attachments &&
              income.payment.attachments.length > 0 && (
                <div className="col-span-2">
                  <p className="font-semibold">
                    Attachments ({income.payment.attachments.length}):
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {income.payment.attachments.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm bg-gray-100 p-2 rounded-md"
                      >
                        <FileText className="h-4 w-4" /> {file.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            <div>
              <p className="font-semibold">Status:</p>
              <p>
                <span
                  className={cn(
                    "text-14-medium capitalize",
                    income.payment.isActive ? "bg-green-500" : "bg-red-600",
                    "text-white px-3 py-1 rounded-xl"
                  )}
                >
                  {income.payment.isActive ? "Active" : "Inactive"}
                </span>
              </p>
            </div>
            <div>
              <p className="font-semibold">Created At:</p>
              <p>{formatDateTime(income.payment.createdAt).dateTime}</p>
            </div>
            <div>
              <p className="font-semibold">Last Updated:</p>
              <p>{formatDateTime(income.payment.updatedAt).dateTime}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-4">
          {mode === "view" && (
            <>
              {income.payment.attachments &&
                income.payment.attachments.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadAttachments}
                    className="shad-gray-btn"
                  >
                    <Download className="h-5 w-5 mr-2" /> Download Attachments
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

export default IncomeDialog;
