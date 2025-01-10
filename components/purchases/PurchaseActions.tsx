import { Purchase } from "@/types/appwrite.types";
import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { usePurchases } from "@/hooks/usePurchases";
import { PurchaseFormValues } from "@/lib/validation";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import PurchaseSheet from "./PurchaseSheet";
import { PurchaseDialog } from "./PurchaseDialog";

const PurchaseActions = ({ purchase }: { purchase: Purchase }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const {
    editPurchase,
    deletePurchase,
    isDeletingPurchase,
    isEditingPurchase,
  } = usePurchases();
  const { isAdmin } = useAuth();

  const handleAction = async (data: PurchaseFormValues) => {
    try {
      if (mode === "edit") {
        await editPurchase(
          { id: purchase.$id, data },
          {
            onSuccess: () => setOpen(false),
          }
        );
      } else if (mode === "delete") {
        await deletePurchase(purchase.$id, {
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
        aria-disabled={!isAdmin}
        onClick={() => {
          if (isAdmin) {
            setMode("edit");
            setOpen(true);
          }
          if (!isAdmin) toast.error("Only admins can edit purchases");
          return;
        }}
        className="text-[#475BE8] p-1 hover:bg-light-200 hover:rounded-md"
      >
        <EditIcon className="h-5 w-5" />
      </span>
      <span
        aria-disabled={!isAdmin}
        onClick={() => {
          if (isAdmin) {
            setMode("delete");
            setOpen(true);
          }
          if (!isAdmin) toast.error("Only admins can delete purchases");
          return;
        }}
        className="text-red-600 p-1 hover:bg-light-200 hover:rounded-md"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>
      <PurchaseSheet
        mode={"edit"}
        open={open && mode === "edit"}
        onOpenChange={setOpen}
        purchase={purchase}
        onSubmit={handleAction}
        isLoading={isEditingPurchase}
      />
      <PurchaseDialog
        mode="delete"
        open={open && mode === "delete"}
        onOpenChange={setOpen}
        purchase={purchase}
        onSubmit={handleAction}
        isLoading={isDeletingPurchase}
      />
    </div>
  );
};

export default PurchaseActions;
