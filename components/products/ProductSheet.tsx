import { Product } from "@/types/appwrite.types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { ProductFormValues } from "@/lib/validation";
import ProductForm from "../forms/ProductForm";

interface ProductSheetProps {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSubmit: (data: ProductFormValues, prevImageId?: string) => Promise<void>;
  isLoading?: boolean;
}

const ProductSheet = ({
  mode,
  open,
  onOpenChange,
  product,
  onSubmit,
}: ProductSheetProps) => {
  const sheetTitle = {
    add: "Add Product",
    edit: "Edit Product",
  }[mode];

  const sheetDescription = {
    add: "Create a new product record for your inventory.",
    edit: "Modify the details of the existing product.",
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

          <ProductForm
            mode={mode === "add" ? "create" : "edit"}
            initialData={
              mode === "edit" && product
                ? {
                    $id: product.$id,
                    name: product.name,
                    description: product.description,
                    costPrice: product.costPrice,
                    sellingPrice: product.sellingPrice,
                    quantity: product.quantity,
                    categoryId: product.categoryId
                      ? product.categoryId.$id
                      : "",
                    typeId: product.typeId ? product.typeId.$id : "",
                    materialId: product.materialId
                      ? product.materialId.$id
                      : "",
                    colorId: product.colorId ? product.colorId.$id : "",
                    unitId: product.unitId ? product.unitId.$id : "",
                    imageId: product.imageId,
                    imageUrl: product.imageUrl,
                    $createdAt: product.$createdAt,
                    $updatedAt: product.$updatedAt,
                  }
                : undefined
            }
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductSheet;
