"use client";

import { PurchaseOrderWithRelations } from "@/types";
import toast from "react-hot-toast";
import PurchaseOrderPDF from "./PurchaseOrderPDF";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useProducts } from "@/hooks/useProducts";
import { useRouter } from "next/navigation";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button } from "../ui/button";
import { PDFViewer } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import { Mail } from "lucide-react";
import { File } from "lucide-react";

interface Props {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder?: PurchaseOrderWithRelations;
}
const PurchaseOrderDialog = ({
  mode,
  open,
  onOpenChange,
  purchaseOrder,
}: Props) => {
  const { softDeletePurchaseOrder, isSoftDeletingPurchaseOrder } =
    usePurchaseOrders();
  const { companySettings } = useCompanySettings();
  const { products } = useProducts({ getAllProducts: true });

  const router = useRouter();

  const handleDelete = async () => {
    try {
      if (purchaseOrder && purchaseOrder.purchaseOrder.id) {
        await softDeletePurchaseOrder(purchaseOrder.purchaseOrder.id, {
          onSuccess: () => {
            toast.success("Purchase order deleted successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deleting purchase:", error);
            toast.error("Failed to delete purchase.");
          },
        });
      } else {
        throw new Error("Purchase is required.");
      }
    } catch (error) {
      console.error("Error deleting purchase:", error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      if (!purchaseOrder) {
        throw new Error("Purchase order is required to generate PDF.");
      }
      const blob = await pdf(
        <PurchaseOrderPDF
          purchaseOrder={purchaseOrder}
          companySettings={{
            name: companySettings?.name ?? "",
            email: companySettings?.email ?? "",
            phone: companySettings?.phone ?? "",
            address: companySettings?.address ?? "",
            city: companySettings?.city ?? "",
            state: companySettings?.state ?? "",
            country: companySettings?.country ?? "",
            currencySymbol: companySettings?.currencySymbol ?? "$",
          }}
          allProducts={products}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `purchase_order_${
        purchaseOrder?.purchaseOrder.purchaseOrderNumber || Date.now()
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

  const handleEmail = async () => {
    try {
      if (!purchaseOrder?.vendor.email) {
        toast.error("Vendor email not found");
        return;
      }

      const subject = `Purchase Order Number: ${
        purchaseOrder?.purchaseOrder.purchaseOrderNumber || "N/A"
      }`;
      const body = `Dear ${
        purchaseOrder?.vendor.name || "Supplier"
      },\n\nPlease find attached the purchase order as requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        purchaseOrder?.vendor.email
      }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        body
      )}`;

      window.open(mailtoLink);

      toast.success(
        "Email client opened. Please attach the downloaded PDF manually."
      );
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
                Delete Purchase
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this purchase order? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Purchase:{" "}
                <span className="font-semibold">
                  {purchaseOrder?.purchaseOrder.purchaseOrderNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSoftDeletingPurchaseOrder}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSoftDeletingPurchaseOrder}
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
          <DialogContent className="max-w-[100rem] w-full h-[96vh] p-0 bg-light-200">
            <DialogHeader className="hidden">
              <DialogTitle></DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <div className="flex flex-col w-full h-full bg-light-200">
              <PDFViewer className="w-full h-full">
                {purchaseOrder && (
                  <PurchaseOrderPDF
                    purchaseOrder={purchaseOrder}
                    companySettings={{
                      name: companySettings?.name ?? "",
                      email: companySettings?.email ?? "",
                      phone: companySettings?.phone ?? "",
                      address: companySettings?.address ?? "",
                      city: companySettings?.city ?? "",
                      state: companySettings?.state ?? "",
                      country: companySettings?.country ?? "",
                      currencySymbol: companySettings?.currencySymbol ?? "$",
                    }}
                    allProducts={products}
                  />
                )}
              </PDFViewer>
              <div className="flex justify-center gap-1.5 py-4 px-5">
                {purchaseOrder &&
                  purchaseOrder.purchaseOrder &&
                  !purchaseOrder.purchaseOrder.isConvertedToPurchase && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          router.push(
                            `/purchases/edit-purchase-order/${purchaseOrder?.purchaseOrder.id}`
                          );
                          onOpenChange(false);
                        }}
                        className="shad-primary-btn"
                      >
                        <EditIcon className="h-5 w-5" />
                        Edit Purchase Order
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          router.push(
                            `/purchases/create-purchase/from-purchase-order/${purchaseOrder?.purchaseOrder.id}`
                          );
                          onOpenChange(false);
                        }}
                        className="shad-gray-btn"
                      >
                        <File className="h-5 w-5" />
                        Convert To Purchase
                      </Button>
                    </>
                  )}
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
                  onClick={() => handleEmail()}
                  className="shad-gray-btn"
                >
                  <Mail className="h-5 w-5" />
                  Email Purchase Order
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="shad-danger-btn"
                >
                  <DeleteIcon className="h-5 w-5" />
                  Delete Purchase Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PurchaseOrderDialog;
