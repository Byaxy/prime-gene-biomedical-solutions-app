import { Purchase } from "@/types/appwrite.types";
import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { usePurchases } from "@/hooks/usePurchases";
import toast from "react-hot-toast";
import { PurchaseDialog } from "./PurchaseDialog";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const PurchaseActions = ({ purchase }: { purchase: Purchase }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const router = useRouter();

  const { deletePurchase, isDeletingPurchase } = usePurchases();
  const { isAdmin } = useAuth();

  const handleAction = async () => {
    try {
      if (mode === "delete") {
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
            router.push(`/purchases/edit-purchase/${purchase.$id}`);
          }
          if (!isAdmin) toast.error("Only admins can edit purchases");
          return;
        }}
        className="text-[#475BE8] p-1 hover:bg-white hover:rounded-md cursor-pointer"
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
        className="text-red-600 p-1 hover:bg-white hover:rounded-md cursor-pointer"
      >
        <DeleteIcon className="h-5 w-5" />
      </span>

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
