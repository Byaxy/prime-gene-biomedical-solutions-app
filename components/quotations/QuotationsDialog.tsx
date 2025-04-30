import { QuotationFormValues } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { QuotationWithRelations } from "@/types";
import { PDFViewer } from "@react-pdf/renderer";
import QuotationPDF from "./QuotationPDF";
import { useTaxes } from "@/hooks/useTaxes";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useProducts } from "@/hooks/useProducts";
interface QuotationDialogProps {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  quotation?: QuotationWithRelations;
  onSubmit: (data: QuotationFormValues) => Promise<void>;
}

const QuotationDialog = ({
  mode,
  open,
  onOpenChange,
  isLoading,
  quotation,
  onSubmit,
}: QuotationDialogProps) => {
  const { taxes } = useTaxes({ getAllTaxes: true });
  const { companySettings } = useCompanySettings();
  const { products } = useProducts({ getAllProducts: true });
  const handleDelete = async () => {
    try {
      if (quotation && quotation.quotation.id) {
        await onSubmit({
          ...quotation.quotation,
          products: quotation.products,
        });
      } else {
        throw new Error("Quotation is required.");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting quotation:", error);
    } finally {
    }
  };

  return (
    <div>
      {mode === "delete" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-2xl bg-light-200">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl text-blue-800">
                Delete Quotation
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to delete this quotation? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <p className="text-sm text-red-500">
                Quotation Number:{" "}
                <span className="font-semibold">
                  {quotation?.quotation?.quotationNumber}
                </span>
              </p>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="shad-primary-btn"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
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
          <DialogContent className="max-w-[100rem] w-full h-[90vh] p-0 bg-light-200">
            <DialogHeader className="hidden">
              <DialogTitle></DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <PDFViewer className="w-full h-full">
              {quotation && (
                <QuotationPDF
                  quotation={quotation}
                  taxes={taxes || []}
                  currencySymbol={companySettings?.currencySymbol || "$"}
                  allProducts={products || []}
                />
              )}
            </PDFViewer>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default QuotationDialog;
