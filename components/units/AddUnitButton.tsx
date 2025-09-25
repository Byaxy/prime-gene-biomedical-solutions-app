"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import AddIcon from "@mui/icons-material/Add";
import UnitsDialog from "./UnitsDialog";

const AddUnitButton = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setIsAddDialogOpen(true)}
        className="shad-primary-btn flex flex-row items-center justify-center gap-1"
      >
        <AddIcon className="h-4 w-4" />
        <span className="text-white font-medium capitalize">Add Unit</span>
      </Button>
      <UnitsDialog
        mode="add"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </>
  );
};

export default AddUnitButton;
