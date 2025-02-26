import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { ProductFormValues } from "@/lib/validation";
import { Product } from "@/types/appwrite.types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProductDialog } from "./ProductDialog";
import ProductSheet from "./ProductSheet";

const ProductActions = ({ product }: { product: Product }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const {
    softDeleteProduct,
    editProduct,
    isSoftDeletingProduct,
    isEditingProduct,
  } = useProducts();

  const handleAction = async (data: ProductFormValues) => {
    try {
      if (mode === "edit") {
        // Edit product
        await editProduct(
          { id: product.$id, data },
          { onSuccess: () => setOpen(false) }
        );
      } else if (mode === "delete") {
        // Delete product
        await softDeleteProduct(product.$id, {
          onSuccess: () => setOpen(false),
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="flex items-center">
      <span
        onClick={() => {
          setMode("edit");
          setOpen(true);
        }}
        className="text-[#475BE8] p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        onClick={() => {
          setMode("delete");
          setOpen(true);
        }}
        className="text-red-600 p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>

      <ProductSheet
        mode="edit"
        open={open && mode === "edit"}
        onOpenChange={setOpen}
        isLoading={isEditingProduct}
        onSubmit={handleAction}
        product={product}
      />

      <ProductDialog
        mode={"delete"}
        open={open && mode === "delete"}
        onOpenChange={setOpen}
        product={product}
        onSubmit={handleAction}
        isLoading={isSoftDeletingProduct}
      />
    </div>
  );
};

export default ProductActions;
