"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Eye } from "lucide-react";
import { RoleWithPermissions } from "@/types";
import RoleDialog from "./RoleDialog";

interface RoleActionsProps {
  role: RoleWithPermissions;
}

const RoleActions: React.FC<RoleActionsProps> = ({ role }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"view" | "delete">("view");
  const router = useRouter();

  const handleEdit = () => {
    if (role.role.isSystemRole) {
      return; // Don't allow editing system roles
    }
    router.push(`/settings/roles/edit/${role.role.id}`);
  };

  const handleView = () => {
    setMode("view");
    setOpenDialog(true);
  };

  const handleDeleteClick = () => {
    if (role.role.isSystemRole) {
      return; // Don't allow deleting system roles
    }
    setMode("delete");
    setOpenDialog(true);
  };

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
        <DropdownMenuContent className="w-72 bg-white py-4 px-2" align="end">
          <DropdownMenuItem
            onClick={handleView}
            className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" /> View Details
          </DropdownMenuItem>
          {!role.role.isSystemRole && (
            <>
              <DropdownMenuItem
                onClick={handleEdit}
                className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              >
                <EditIcon className="mr-2 h-4 w-4" /> Edit Role
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              >
                <DeleteIcon className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {openDialog && (
        <RoleDialog
          mode={mode}
          open={openDialog}
          onOpenChange={closeDialog}
          role={role}
        />
      )}
    </>
  );
};

export default RoleActions;
