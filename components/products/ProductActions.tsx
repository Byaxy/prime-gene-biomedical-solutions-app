import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProductDialog } from "./ProductDialog";
import { useRouter } from "next/navigation";
import { ProductWithRelations } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { EllipsisVertical } from "lucide-react";
import { FileText } from "lucide-react";
import { Eye } from "lucide-react";

const ProductActions = ({ product }: { product: ProductWithRelations }) => {
  const [open, setOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | "view">("add");

  const router = useRouter();

  const { softDeleteProduct, isSoftDeletingProduct } = useProducts();

  const handleAction = async () => {
    try {
      if (mode === "delete") {
        await softDeleteProduct(product.product.id, {
          onSuccess: () => setOpenDialog(false),
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </PopoverTrigger>
        <PopoverContent className="w-72 flex flex-col mt-2 mr-12 gap-2 bg-white z-50">
          <p
            onClick={() => {
              setMode("view");
              setOpenDialog(true);
            }}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="h-5 w-5" />
            <span>View Details</span>
          </p>
          <p
            onClick={() => {
              router.push(
                `/inventory/duplicate-inventory/${product.product.id}`
              );
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <FileText className="h-5 w-5" /> <span>Duplicate</span>
          </p>
          <p
            onClick={() => {
              setMode("edit");
              router.push(`/inventory/edit-inventory/${product.product.id}`);
            }}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="h-5 w-5" /> <span>Edit</span>
          </p>
          <p
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" /> <span>Delete</span>
          </p>
        </PopoverContent>
      </Popover>

      <ProductDialog
        mode={"delete"}
        open={openDialog && mode === "delete"}
        onOpenChange={setOpenDialog}
        product={product}
        onSubmit={handleAction}
        isLoading={isSoftDeletingProduct}
      />
      <ProductDialog
        mode={"view"}
        open={openDialog && mode === "view"}
        onOpenChange={setOpenDialog}
        product={product}
      />
    </div>
  );
};

export default ProductActions;
