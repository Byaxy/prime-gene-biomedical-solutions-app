import { SaleFormValues } from "@/lib/validation";
import { Sale } from "@/types/appwrite.types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import SaleForm from "../forms/SaleForm";

interface SaleSheetProps {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: Sale;
  onSubmit: (data: SaleFormValues) => Promise<void>;
  isLoading: boolean;
}
const SaleSheet = ({
  mode,
  open,
  onOpenChange,
  sale,
  onSubmit,
  isLoading,
}: SaleSheetProps) => {
  const sheetTitle = {
    add: "Add Sale",
    edit: "Edit Sale",
  }[mode];

  const sheetDescription = {
    add: "Create a new sale record for your inventory.",
    edit: "Modify the details of the existing sale.",
  }[mode];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] bg-light-200 py-10">
        <div className="flex flex-col w-full h-full container max-w-5xl mx-auto space-y-6">
          <SheetHeader className="space-y-2">
            <SheetTitle className="text-xl text-blue-800">
              {sheetTitle}
            </SheetTitle>
            <SheetDescription className="text-dark-500">
              {sheetDescription}
            </SheetDescription>
          </SheetHeader>

          <SaleForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && sale
                ? {
                    invoiceNumber: sale?.invoiceNumber,
                    totalAmount: sale?.totalAmount,
                    amountPaid: sale?.amountPaid,
                    customerId: sale?.customerId ? sale?.customerId.$id : "",
                    saleDate: new Date(sale?.saleDate),
                    status: sale?.status,
                    paymentMethod: sale?.paymentMethod,
                    notes: sale?.notes,
                    products: sale.products,
                  }
                : undefined
            }
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SaleSheet;
