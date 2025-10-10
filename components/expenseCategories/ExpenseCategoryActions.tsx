"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { EllipsisVertical } from "lucide-react";
import { ExpenseCategoryWithRelations } from "@/types";
import ExpenseCategoryDialog from "./ExpenseCategoryDialog";

interface ExpenseCategoryActionsProps {
  category: ExpenseCategoryWithRelations;
}

const ExpenseCategoryActions: React.FC<ExpenseCategoryActionsProps> = ({
  category,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const router = useRouter();

  const handleEdit = () => {
    router.push(
      `/settings/expense-categories/edit/${category.expenseCategory.id}`
    );
  };

  const handleDeleteClick = () => {
    setOpenDialog(true);
  };

  // handle close dialog
  const closeDialog = useCallback(() => {
    setOpenDialog(false);

    setTimeout(() => {
      const stuckSection = document.querySelector(".MuiBox-root.css-0");
      if (stuckSection instanceof HTMLElement) {
        stuckSection.style.pointerEvents = "auto";
      }
    }, 100);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 bg-white py-4 px-2" align="end">
          <DropdownMenuItem
            onClick={handleEdit}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="mr-2 h-5 w-5" /> Edit Category
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="mr-2 h-5 w-5" /> Deactivate Category
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExpenseCategoryDialog
        open={openDialog}
        onOpenChange={closeDialog}
        category={category}
      />
    </>
  );
};

export default ExpenseCategoryActions;
