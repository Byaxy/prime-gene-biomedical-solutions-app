"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import AddIcon from "@mui/icons-material/Add";
import ProductTypeDialog from "./ProductTypeDialog";
const AddTypeButton = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setIsAddDialogOpen(true)}
        className="shad-primary-btn flex flex-row items-center justify-center gap-1"
      >
        <AddIcon className="h-4 w-4" />
        <span className="text-white font-medium capitalize">Add Type</span>
      </Button>
      <ProductTypeDialog
        mode="add"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </>
  );
};

export default AddTypeButton;
