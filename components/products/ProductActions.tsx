import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProductDialog } from "./ProductDialog";
import { useRouter } from "next/navigation";
import { ProductWithRelations } from "@/types";
import { EllipsisVertical } from "lucide-react";
import { FileText } from "lucide-react";
import { Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const ProductActions = ({ product }: { product: ProductWithRelations }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<
    "add" | "edit" | "delete" | "view" | "reactivate" | "deactivate"
  >("add");

  const router = useRouter();

  // handle close dialog
  const closeDialog = () => {
    setOpenDialog(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  };

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 bg-white py-4 px-2" align="end">
          <DropdownMenuItem
            onClick={() => {
              setMode("view");
              setOpenDialog(true);
            }}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="h-5 w-5" />
            <span>View Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              router.push(
                `/inventory/duplicate-inventory/${product.product.id}`
              );
            }}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <FileText className="h-5 w-5" />
            <span>Duplicate</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMode("edit");
              router.push(`/inventory/edit-inventory/${product.product.id}`);
            }}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="h-5 w-5" />
            <span>Edit Purchase</span>
          </DropdownMenuItem>

          {product.product.isActive && (
            <DropdownMenuItem
              onClick={() => {
                setMode("deactivate");
                setOpenDialog(true);
              }}
              className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
            >
              <DeleteIcon className="h-5 w-5" />
              <span>Deactivate</span>
            </DropdownMenuItem>
          )}

          {!product.product.isActive && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setMode("reactivate");
                  setOpenDialog(true);
                }}
                className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              >
                <FileText className="h-5 w-5" />
                <span>Reactivate</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMode("delete");
                  setOpenDialog(true);
                }}
                className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              >
                <DeleteIcon className="h-5 w-5" />
                <span>Delete</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ProductDialog
        mode={mode}
        open={openDialog}
        onOpenChange={closeDialog}
        product={product}
      />
    </div>
  );
};

export default ProductActions;
