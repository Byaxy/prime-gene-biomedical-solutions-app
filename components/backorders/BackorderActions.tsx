"use client";

import { useCallback, useState } from "react";
import { ArrowRightCircle } from "lucide-react";
import BackorderFulfillmentDialog from "./BackorderFulfillmentDialog";
import { BackorderWithRelations } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import DeleteIcon from "@mui/icons-material/Delete";

interface BackorderActionsProps {
  backOrder: BackorderWithRelations;
}

const BackorderActions = ({ backOrder }: BackorderActionsProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"fullfill" | "delete">("fullfill");

  const handleFulfill = () => {
    setMode("fullfill");
    setOpen(true);
  };

  const handleDeleteClick = () => {
    setMode("delete");
    setOpen(true);
  };

  const closeDialog = useCallback(() => {
    setOpen(false);
    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  }, []);

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 bg-white py-4 px-2" align="end">
          <DropdownMenuItem
            onClick={handleFulfill}
            className="text-dark-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <ArrowRightCircle className="h-5 w-5" />{" "}
            <span>Fulfill Backorder</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" /> <span>Delete Backorder</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BackorderFulfillmentDialog
        mode={mode}
        open={open}
        onOpenChange={closeDialog}
        backOrder={backOrder}
      />
    </div>
  );
};

export default BackorderActions;
