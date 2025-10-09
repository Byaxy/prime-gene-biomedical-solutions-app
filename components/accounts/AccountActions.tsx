import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Eye } from "lucide-react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { AccountWithRelations } from "@/types";
import AccountDialog from "./AccountDialog";

interface AccountActionsProps {
  account: AccountWithRelations;
}

const AccountActions: React.FC<AccountActionsProps> = ({ account }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"view" | "delete" | null>(null);
  const router = useRouter();

  // handle close dialog
  const closeDialog = useCallback(() => {
    setOpenDialog(false);
    setMode(null);

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
        <DropdownMenuContent className="w-64 bg-white py-4 px-2" align="end">
          <DropdownMenuItem
            onClick={() => {
              setMode("view");
              setOpenDialog(true);
            }}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" /> <span>Account Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setMode(null);
              router.push(
                `/accounting-and-finance/banking/edit-account/${account.account.id}`
              );
            }}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="mr-2 h-4 w-4" /> <span>Edit Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setMode("delete");
              setOpenDialog(true);
            }}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="mr-2 h-4 w-4" />
            <span>Deactivate Account</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {openDialog && mode && (
        <AccountDialog
          mode={mode}
          open={openDialog}
          onOpenChange={closeDialog}
          account={account}
        />
      )}
    </div>
  );
};

export default AccountActions;
