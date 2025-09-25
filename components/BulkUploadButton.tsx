"use client";

import { useState } from "react";
import { ProductDialog } from "./products/ProductDialog";
import { Button } from "./ui/button";
import AddIcon from "@mui/icons-material/Add";

const BulkUploadButton = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsAddDialogOpen(true)}
        className="shad-primary-btn flex flex-row items-center justify-center gap-1"
      >
        <AddIcon className="h-4 w-4" />
        <span className="text-white font-medium capitalize">Uplaod Bulk</span>
      </Button>
      <ProductDialog
        mode={"add"}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        isBulkProductUpload={true}
      />
    </>
  );
};

export default BulkUploadButton;
