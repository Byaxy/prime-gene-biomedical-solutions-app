/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { ReceiptWithRelations } from "@/types";
import { useReceipts } from "@/hooks/useReceipts";
import toast from "react-hot-toast";
import { PDFViewer } from "@react-pdf/renderer";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Mail, Download } from "lucide-react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { useRouter } from "next/navigation";
import ReceiptPDF from "./ReceiptPDF";

interface ReceiptDialogProps {
  mode: "view" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptWithRelations;
}

const ReceiptDialog = ({
  mode,
  open,
  onOpenChange,
  receipt,
}: ReceiptDialogProps) => {
  const { softDeleteReceipt, isSoftDeletingReceipt } = useReceipts();
  const { companySettings } = useCompanySettings();

  const router = useRouter();

  const handleDelete = async () => {
    try {
      if (receipt && receipt.receipt?.id) {
        await softDeleteReceipt(
          { id: receipt.receipt.id },
          {
            onSuccess: () => {
              toast.success("Receipt deleted successfully.");
              onOpenChange(false);
            },
            onError: (error: any) => {
              console.error("Error deleting receipt:", error);
              toast.error("Failed to delete receipt.");
            },
          }
        );
      } else {
        throw new Error("Receipt ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error deleting receipt:", error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <ReceiptPDF
          receipt={receipt}
          currencySymbol={companySettings?.currencySymbol || "$"}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Receipt_${
        receipt.receipt.receiptNumber || Date.now()
      }.pdf`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleEmailReceipt = async () => {
    try {
      if (!receipt.customer?.email) {
        toast.error("Customer email not found");
        return;
      }

      const subject = `Receipt Number: ${receipt.receipt.receiptNumber}`;
      const body = `Dear ${
        receipt.customer?.name || "Customer"
      },\n\nPlease find attached your payment receipt as requested.\n\nBest regards,\nYour Company \nAccounting Team`;

      // First, download the PDF (optional, you might want to generate a separate PDF for email)
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        receipt.customer.email
      }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        body
      )}`;

      window.open(mailtoLink);

      toast.success(
        "Email client opened. Please attach the downloaded PDF manually."
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Error preparing email:", error);
      toast.error("Failed to prepare email");
    }
  };

  return (
    <div>
      {mode === "delete" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-2xl bg-light-200">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl text-blue-800">
                Delete Receipt
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this receipt? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Receipt Number:{" "}
                <span className="font-semibold">
                  {receipt?.receipt.receiptNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingReceipt}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSoftDeletingReceipt}
                  className="shad-danger-btn"
                >
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {mode === "view" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className="max-w-[100rem] w-full h-[96vh] p-0 bg-light-200"
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
            <DialogHeader className="hidden">
              <DialogTitle></DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <div className="flex flex-col w-full h-full bg-light-200">
              <PDFViewer className="w-full h-full">
                {
                  <ReceiptPDF
                    receipt={receipt}
                    currencySymbol={companySettings?.currencySymbol || "$"}
                  />
                }
              </PDFViewer>
              <div className="flex justify-center gap-1.5 py-4 px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.push(
                      `/accounting-and-finance/income/receipts/edit/${receipt.receipt.id}`
                    );
                    onOpenChange(false);
                  }}
                  className="shad-primary-btn"
                >
                  <EditIcon className="h-5 w-5" />
                  Edit Receipt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleDownloadPDF();
                    onOpenChange(false);
                  }}
                  className="shad-gray-btn"
                >
                  <Download className="h-5 w-5" />
                  Download as PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleEmailReceipt()}
                  className="shad-gray-btn"
                >
                  <Mail className="h-5 w-5" />
                  Email Receipt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="shad-danger-btn"
                >
                  <DeleteIcon className="h-5 w-5" />
                  Delete Receipt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReceiptDialog;
