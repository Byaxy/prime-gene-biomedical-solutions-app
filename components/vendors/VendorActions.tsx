import { useState } from "react";
import { VendorFormValues } from "@/lib/validation";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useVendors } from "@/hooks/useVendors";
import VendorDialog from "./VendorDialog";
import { Vendor } from "@/types";

const VendorActions = ({ vendor }: { vendor: Vendor }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const {
    softDeleteVendor,
    editVendor,
    isSoftDeletingVendor,
    isEditingVendor,
  } = useVendors();

  const handleAction = async (data: VendorFormValues) => {
    try {
      if (mode === "edit") {
        await editVendor(
          { id: vendor.id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        await softDeleteVendor(vendor.id, {
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
      <VendorDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        vendor={vendor}
        onSubmit={handleAction}
        isLoading={isSoftDeletingVendor || isEditingVendor}
      />
    </div>
  );
};

export default VendorActions;
