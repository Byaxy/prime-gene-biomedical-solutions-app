import { useState } from "react";
import { StoreFormValues } from "@/lib/validation";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StoreDialog from "./StoreDialog";
import { useStores } from "@/hooks/useStores";
import { Store } from "@/types";

const StoreActions = ({ store }: { store: Store }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete">("add");

  const { softDeleteStore, editStore, isSoftDeletingStore, isEditingStore } =
    useStores();

  const handleAction = async (data: StoreFormValues) => {
    try {
      if (mode === "edit") {
        await editStore(
          { id: store.id, data },
          { onSuccess: () => setOpen(false) }
        );
        setOpen(false);
      } else if (mode === "delete") {
        await softDeleteStore(store.id, {
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
      <StoreDialog
        mode={mode}
        open={open}
        onOpenChange={setOpen}
        store={store}
        onSubmit={handleAction}
        isLoading={isSoftDeletingStore || isEditingStore}
      />
    </div>
  );
};

export default StoreActions;
