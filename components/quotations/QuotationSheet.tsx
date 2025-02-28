import { QuotationFormValues } from "@/lib/validation";
import { Quotation } from "@/types/appwrite.types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import QuotationForm from "../forms/QuotationForm";

interface QuotationSheetProps {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Quotation;
  onSubmit: (data: QuotationFormValues) => Promise<void>;
  isLoading: boolean;
}
const QuotationSheet = ({
  mode,
  open,
  onOpenChange,
  quotation,
  onSubmit,
  isLoading,
}: QuotationSheetProps) => {
  const sheetTitle = {
    add: "Add Quotation",
    edit: "Edit Quotation",
  }[mode];

  const sheetDescription = {
    add: "Create a new quotation record for your inventory.",
    edit: "Modify the details of the existing quotation.",
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

          <QuotationForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && quotation
                ? {
                    $id: quotation.$id,
                    quotationNumber: quotation?.quotationNumber,
                    totalAmount: quotation?.totalAmount,
                    amountPaid: quotation?.amountPaid,
                    customer: quotation?.customer
                      ? quotation?.customer.$id
                      : "",
                    quotationDate: new Date(quotation?.quotationDate),
                    status: quotation?.status,
                    paymentMethod: quotation?.paymentMethod,
                    notes: quotation?.notes,
                    products: quotation.products,
                    $createdAt: new Date(quotation.$createdAt),
                    $updatedAt: new Date(quotation.$updatedAt),
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

export default QuotationSheet;
