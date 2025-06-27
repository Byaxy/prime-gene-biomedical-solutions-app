import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaleDialog from "./SaleDialog";
import { useRouter } from "next/navigation";
import { InventoryStockWithRelations, SaleWithRelations } from "@/types";
import toast from "react-hot-toast";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { EllipsisVertical } from "lucide-react";
import { Download } from "lucide-react";
import { Mail } from "lucide-react";
import { Plus } from "lucide-react";
import { ShoppingCart } from "lucide-react";
import { Truck } from "lucide-react";
import SaleInvoice from "./SaleInvoice";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Eye } from "lucide-react";
import { FileText } from "lucide-react";
import { useInventoryStock } from "@/hooks/useInventoryStock";

const SaleActions = ({ sale }: { sale: SaleWithRelations }) => {
  const [open, setOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "view">("add");

  const { companySettings } = useCompanySettings();
  const { inventoryStock } = useInventoryStock({
    getAllInventoryStocks: true,
  });

  const router = useRouter();

  // helper function to check if sale has deliverable products
  const hasDeliverableProducts = (sale: SaleWithRelations): boolean => {
    if (!sale?.products?.length || !inventoryStock?.length) {
      return false;
    }

    return sale.products.reduce((hasDeliverable: boolean, product) => {
      if (hasDeliverable) return true;

      if (
        !product?.productId ||
        !product.productID ||
        !product?.storeId ||
        typeof product.fulfilledQuantity !== "number" ||
        typeof product.quantity !== "number"
      ) {
        return false;
      }

      const hasUnfulfilledQuantity =
        product.fulfilledQuantity < product.quantity;
      if (!hasUnfulfilledQuantity) return false;

      // Check if there's available inventory using reduce
      const hasAvailableInventory = inventoryStock.reduce(
        (hasStock: boolean, inv: InventoryStockWithRelations) => {
          if (hasStock) return true;

          // Validate inventory structure
          if (
            !inv?.product?.id ||
            !inv?.product?.productID ||
            !inv?.store?.id ||
            !inv?.inventory?.quantity
          ) {
            return false;
          }

          // Check if inventory matches product and has positive quantity
          return (
            inv.product.id === product.productId &&
            inv.product.productID === product.productID &&
            inv.store.id === product.storeId &&
            inv.inventory.quantity > 0
          );
        },
        false
      );

      return hasAvailableInventory;
    }, false);
  };

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <SaleInvoice
          sale={sale}
          currencySymbol={companySettings?.currencySymbol || "$"}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice_${sale.sale.invoiceNumber || Date.now()}.pdf`;
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

  const handleEmailSale = async () => {
    try {
      if (!sale.customer.email) {
        toast.error("Customer email not found");
        return;
      }

      const subject = `Invoice Number: ${sale.sale.invoiceNumber}`;
      const body = `Dear ${
        sale.customer.name || "Customer"
      },\n\nPlease find attached the sale invoice as requested.\n\nBest regards,\nYour Company \nSales Team`;

      // First, download the PDF
      await handleDownloadPDF();

      const mailtoLink = `mailto:${
        sale.customer.email
      }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        body
      )}`;

      window.open(mailtoLink);

      toast.success(
        "Email client opened. Please attach the downloaded PDF manually."
      );
      setOpen(false);
    } catch (error) {
      console.error("Error preparing email:", error);
      toast.error("Failed to prepare email");
    }
  };

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </PopoverTrigger>
        <PopoverContent className="w-72 flex flex-col mt-2 mr-12 gap-2 bg-white z-50">
          <p
            onClick={() => {
              setMode("view");
              setOpenDialog(true);
              setOpen(false);
            }}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="h-5 w-5" />
            <span>Sale Details</span>
          </p>
          <p
            onClick={() => {
              router.push(`/sales/duplicate-invoice/${sale.sale.id}`);
              setOpen(false);
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Plus className="h-5 w-5" /> <span>Duplicate Sale</span>
          </p>
          <p
            onClick={() => {
              router.push(
                `/promissory-notes/create-promissory-note/from-sale/${sale.sale.id}`
              );
              setOpen(false);
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <FileText className="h-5 w-5" /> <span>Promissory Note</span>
          </p>
          <p
            onClick={() => {
              if (hasDeliverableProducts(sale)) {
                router.push(
                  `/waybills/create-waybill/from-sale/${sale.sale.id}`
                );
              } else {
                toast.error("No deliverable products available for this sale");
              }
              setOpen(false);
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <ShoppingCart className="h-5 w-5" /> <span>Create Waybill</span>
          </p>
          <p
            onClick={() => {
              if (sale.sale.isDeliveryNoteCreated) {
                toast.error("Delivery Note already created");
              } else {
                router.push(
                  `/deliveries/create-delivery/from-sale/${sale.sale.id}`
                );
              }
              setOpen(false);
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Truck className="h-5 w-5" /> <span>Add Delivery</span>
          </p>
          <p
            onClick={() => {
              setMode("edit");
              router.push(`/sales/edit-invoice/${sale.sale.id}`);
              setOpen(false);
            }}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="h-5 w-5" /> <span>Edit Sale</span>
          </p>
          <p
            onClick={() => {
              handleDownloadPDF();
              setOpen(false);
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Download className="h-5 w-5" /> <span>Download as PDF</span>
          </p>
          <p
            onClick={() => {
              handleEmailSale();
              setOpen(false);
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Mail className="h-5 w-5" /> <span>Email Sale</span>
          </p>

          <p
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
              setOpen(false);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" /> <span>Delete Sale</span>
          </p>
        </PopoverContent>
      </Popover>

      <SaleDialog
        mode={mode}
        open={openDialog}
        onOpenChange={setOpenDialog}
        sale={sale}
      />
    </div>
  );
};

export default SaleActions;
