import { useCallback, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/navigation";
import { IncomeWithRelations } from "@/types";
import { EllipsisVertical } from "lucide-react";

import { Eye } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import IncomeDialog from "./IncomeDialog";

const IncomeActions = ({ income }: { income: IncomeWithRelations }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"view" | "delete">("view");

  const router = useRouter();

  const handleEdit = () => {
    router.push(`/accounting-and-finance/income/edit/${income.payment.id}`);
  };

  const handleView = () => {
    setMode("view");
    setOpenDialog(true);
  };

  const handleDeleteClick = () => {
    setMode("delete");
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
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 bg-white py-4 px-2" align="end">
          <DropdownMenuItem
            onClick={handleView}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleEdit}
            className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <EditIcon className="mr-2 h-4 w-4" /> Edit Income
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <DeleteIcon className="mr-2 h-4 w-4" /> Deactivate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <IncomeDialog
        mode={mode}
        open={openDialog}
        onOpenChange={closeDialog}
        income={income}
      />
    </div>
  );
};

export default IncomeActions;
