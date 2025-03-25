import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProductDialog } from "./ProductDialog";
import { useRouter } from "next/navigation";
import { Product } from "@/types";

const ProductActions = ({ product }: { product: Product }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const router = useRouter();

  const { softDeleteProduct, isSoftDeletingProduct } = useProducts();

  const handleAction = async () => {
    try {
      if (mode === "delete") {
        await softDeleteProduct(product.id, {
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
          router.push(`/inventory/edit-inventory/${product.id}`);
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
