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
import { EllipsisVertical, Eye, CheckCircle2, XCircle } from "lucide-react";
import {
  CommissionWithRelations,
  CommissionStatus,
  CommissionPaymentStatus,
} from "@/types";
import { useCommissions } from "@/hooks/useCommissions";
import toast from "react-hot-toast";
import { cn, parseServerError } from "@/lib/utils";
import CommissionDialog from "./CommissionDialog";

interface CommissionActionsProps {
  commission: CommissionWithRelations;
}

const CommissionActions: React.FC<CommissionActionsProps> = ({
  commission,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"view" | "status" | "delete">("view");

  const router = useRouter();

  const { updateMainCommissionStatus, isUpdatingMainCommissionStatus } =
    useCommissions();

  const handleEdit = () => {
    // Only allow editing if it's not approved or paid yet
    if (
      commission.commission.status === CommissionStatus.Approved ||
      commission.commission.paymentStatus === CommissionPaymentStatus.Paid ||
      commission.commission.paymentStatus === CommissionPaymentStatus.Partial
    ) {
      toast.error(
        "Cannot edit a commission that is approved, partially paid, or fully paid."
      );
      return;
    }
    router.push(
      `/accounting-and-finance/commissions/edit/${commission.commission.id}`
    );
  };

  const handleView = () => {
    setMode("view");
    setOpenDialog(true);
  };

  const handlePayoutClick = () => {
    router.push(
      `/accounting-and-finance/commissions/pay/${commission.commission.id}`
    );
  };

  const handleDeleteClick = () => {
    setMode("delete");
    setOpenDialog(true);
  };

  const handleUpdateStatus = async (newStatus: CommissionStatus) => {
    const loadingToastId = toast.loading(`Updating status to ${newStatus}...`);
    try {
      await updateMainCommissionStatus(
        {
          commissionId: commission.commission.id,
          newStatus,
        },
        {
          onSuccess: () => {
            toast.success(`Commission status updated to ${newStatus}!`, {
              id: loadingToastId,
            });
            router.refresh();
          },
          onError: (error) => {
            toast.error(
              parseServerError(error) ||
                `Failed to update status to ${newStatus}.`,
              { id: loadingToastId, duration: 6000 }
            );
          },
        }
      );
    } catch (error) {
      console.error(`Error updating commission status to ${newStatus}:`, error);
      toast.error(parseServerError(error), {
        id: loadingToastId,
        duration: 6000,
      });
    }
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

  const canApprove =
    commission.commission.status === CommissionStatus.PendingApproval;
  const canCancel =
    commission.commission.status !== CommissionStatus.Cancelled &&
    commission.commission.paymentStatus === CommissionPaymentStatus.Pending; // Only if not paid yet
  const canPayout =
    commission.commission.status === CommissionStatus.Approved &&
    commission.commission.paymentStatus !== CommissionPaymentStatus.Paid &&
    commission.recipients.some(
      (r) =>
        r.recipient.paymentStatus === CommissionPaymentStatus.Pending ||
        r.recipient.paymentStatus === CommissionPaymentStatus.Partial
    );
  const canDelete =
    commission.commission.paymentStatus === CommissionPaymentStatus.Pending;

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

          <DropdownMenuItem
            onClick={handleEdit}
            className={cn(
              "p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer",
              !(canApprove || canCancel) && "text-gray-400 cursor-not-allowed",
              (canApprove || canCancel) && "text-[#475BE8]"
            )}
            disabled={!(canApprove || canCancel)}
          >
            <EditIcon className="mr-2 h-4 w-4" /> Edit Commission
          </DropdownMenuItem>

          {canApprove && (
            <DropdownMenuItem
              onClick={() => handleUpdateStatus(CommissionStatus.Approved)}
              className="text-blue-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              disabled={isUpdatingMainCommissionStatus}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Commission
            </DropdownMenuItem>
          )}

          {canPayout && (
            <DropdownMenuItem
              onClick={handlePayoutClick}
              className="text-orange-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Process Payout
            </DropdownMenuItem>
          )}

          {canCancel && (
            <DropdownMenuItem
              onClick={() => handleUpdateStatus(CommissionStatus.Cancelled)}
              className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              disabled={isUpdatingMainCommissionStatus}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel Commission
            </DropdownMenuItem>
          )}

          {canDelete && (
            <DropdownMenuItem
              onClick={handleDeleteClick}
              className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
            >
              <DeleteIcon className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {openDialog && (
        <CommissionDialog
          mode={mode}
          open={openDialog}
          onOpenChange={closeDialog}
          commission={commission}
        />
      )}
    </>
  );
};

export default CommissionActions;
