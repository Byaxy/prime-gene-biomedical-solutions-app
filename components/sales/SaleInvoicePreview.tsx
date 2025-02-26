import { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import type { Sale } from "@/types/appwrite.types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import SaleInvoice from "./SaleInvoice";

interface SaleInvoicePreviewProps {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SaleInvoicePreview = ({
  sale,
  open,
  onOpenChange,
}: SaleInvoicePreviewProps) => {
  const [isClient, setIsClient] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    onAfterPrint: () => {
      onOpenChange(false);
    },
  });

  if (!isClient) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-light-200 py-10">
        <DialogTitle className="flex justify-between items-center mb-4">
          <span className="text-xl font-semibold text-blue-800">
            Invoice Preview
          </span>
          <Button onClick={() => handlePrint()} className="shad-primary-btn">
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
        </DialogTitle>
        <div className="flex-1 overflow-auto">
          <SaleInvoice sale={sale} componentRef={componentRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleInvoicePreview;
