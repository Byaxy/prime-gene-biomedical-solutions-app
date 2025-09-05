import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ProductTypeDialog from "./ProductTypeDialog";
import { ProductType } from "@/types";

const TypeActions = ({ productType }: { productType: ProductType }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

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
      <ProductTypeDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        productType={productType}
      />
    </div>
  );
};

export default TypeActions;
