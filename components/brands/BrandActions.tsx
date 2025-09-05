import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BrandDialog from "./BrandDialog";
import { Brand } from "@/types";

const BrandActions = ({ brand }: { brand: Brand }) => {
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

      <BrandDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        brand={brand}
      />
    </div>
  );
};

export default BrandActions;
