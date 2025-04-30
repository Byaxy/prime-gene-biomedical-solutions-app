import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ProductForm from "../forms/ProductForm";

interface ProductSheetProps {
  mode: "add" | "edit" | "delete" | "view";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProductSheet = ({ mode, open, onOpenChange }: ProductSheetProps) => {
  return (
    <>
      {mode === "add" && (
        <Sheet
          key={"product-add-sheet"}
          open={open}
          onOpenChange={onOpenChange}
        >
          <SheetContent side={"bottom"} className="max-h-[90vh] bg-light-200">
            <div className=" max-w-7xl mx-auto">
              <SheetHeader className="pb-8">
                <SheetTitle>Add Inventory</SheetTitle>
                <SheetDescription>
                  Fill in the details to add a new inventory
                </SheetDescription>
              </SheetHeader>
              <div className="max-h-[80vh] overflow-y-auto pb-8">
                <ProductForm
                  mode="create"
                  onCancel={() => onOpenChange(false)}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

export default ProductSheet;
