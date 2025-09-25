"use client";

import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { Button } from "../ui/button";
import StoreDialog from "./StoreDialog";
import { StoreFormValues } from "@/lib/validation";
import { useStores } from "@/hooks/useStores";
const AddStoreButton = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { addStore, isAddingStore } = useStores();

  const handleAddStore = async (data: StoreFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addStore(data, {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  return (
    <>
      <Button
        onClick={() => setIsAddDialogOpen(true)}
        className="shad-primary-btn flex flex-row items-center justify-center gap-1"
      >
        <AddIcon className="h-4 w-4" />
        <span className="text-white font-medium capitalize">Add Store</span>
      </Button>
      <StoreDialog
        mode="add"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        isLoading={isAddingStore}
        onSubmit={handleAddStore}
      />
    </>
  );
};

export default AddStoreButton;
