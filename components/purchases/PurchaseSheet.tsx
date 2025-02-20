import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { PurchaseFormValues } from "@/lib/validation";
import { Purchase } from "@/types/appwrite.types";
import PurchaseForm from "../forms/PurchaseForm";

interface PurchaseSheetProps {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase?: Purchase;
  onSubmit: (data: PurchaseFormValues) => Promise<void>;
  isLoading: boolean;
}

export default function PurchaseSheet({
  mode,
  open,
  onOpenChange,
  purchase,
  onSubmit,
  isLoading,
}: PurchaseSheetProps) {
  const sheetTitle = {
    add: "Add Purchase",
    edit: "Edit Purchase",
  }[mode];

  const sheetDescription = {
    add: "Create a new purchase record for your inventory.",
    edit: "Modify the details of the existing purchase.",
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

          <PurchaseForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && purchase
                ? {
                    purchaseOrderNumber: purchase?.purchaseOrderNumber,
                    totalAmount: purchase?.totalAmount,
                    amountPaid: purchase?.amountPaid,
                    supplierId: purchase?.supplierId
                      ? purchase?.supplierId.$id
                      : "",
                    purchaseDate: new Date(purchase?.purchaseDate),
                    status: purchase?.status,
                    paymentMethod: purchase?.paymentMethod,
                    deliveryStatus: purchase?.deliveryStatus,
                    notes: purchase?.notes,
                    products: purchase.products,
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
}
