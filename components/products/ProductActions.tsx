import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { ProductFormValues } from "@/lib/validation";
import { Product } from "@/types/appwrite.types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProductDialog } from "./ProductDialog";

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
    // Handle different actions based on mode
    try {
      if (mode === "edit") {
        // Edit product
        await editProduct(
          { id: product.$id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
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
        className="text-[#475BE8] p-1 hover:bg-light-200 hover:rounded-md"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        onClick={() => {
          setMode("delete");
          setOpen(true);
        }}
        className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>
      <ProductDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        product={product}
        onSubmit={handleAction}
        isLoading={isSoftDeletingProduct || isEditingProduct}
      />
    </div>
  );
};

export default ProductActions;
