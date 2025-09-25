"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import AddIcon from "@mui/icons-material/Add";
import TaxDialog from "./TaxDialog";
import { useTaxes } from "@/hooks/useTaxes";
import { TaxFormValues } from "@/lib/validation";
const AddTaxButton = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { addTax, isAddingTax } = useTaxes();

  const handleAddTax = async (data: TaxFormValues): Promise<void> => {
    return new Promise((resolve, reject) => {
      addTax(data, {
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
        <span className="text-white font-medium capitalize">Add Tax</span>
      </Button>
      <TaxDialog
        mode="add"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        isLoading={isAddingTax}
        onSubmit={handleAddTax}
      />
    </>
  );
};

export default AddTaxButton;
