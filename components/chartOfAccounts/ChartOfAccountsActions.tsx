"use client";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { EllipsisVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useCallback, useState } from "react";
import ChartOfAccountsDialog from "./ChartOfAccountsDialog";
import { ChartOfAccountWithRelations } from "@/types";
import { useRouter } from "next/navigation";
const ChartOfAccountsActions = ({
  account,
}: {
  account: ChartOfAccountWithRelations;
}) => {
  const [openDialog, setOpenDialog] = useState(false);

  const router = useRouter();

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
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-light-200 cursor-pointer p-2 rounded-full" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-60 bg-light-200 py-4 px-2"
          align="end"
        >
          <DropdownMenuItem
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-white hover:rounded-md cursor-pointer"
            onClick={() =>
              router.push(
                `/accounting-and-finance/chart-of-accounts/edit-chart-of-accounts/${account.account.id}`
              )
            }
          >
            <EditIcon className="mr-2 h-4 w-4" /> <span>Edit Account</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setOpenDialog(true)}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-white hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="h-5 w-5" /> <span>Delete Account</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChartOfAccountsDialog
        open={openDialog}
        onOpenChange={closeDialog}
        account={account}
      />
    </div>
  );
};

export default ChartOfAccountsActions;
