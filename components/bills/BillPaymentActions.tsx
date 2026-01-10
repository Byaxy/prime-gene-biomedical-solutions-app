"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, Eye, Wallet } from "lucide-react";
import { BillTrackerData, PaymentStatus } from "@/types";
import BillPaymentDialog from "./BillPaymentDialog";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import toast from "react-hot-toast";

interface BillPaymentActionsProps {
  billTrackerData: BillTrackerData;
}

const BillPaymentActions: React.FC<BillPaymentActionsProps> = ({
  billTrackerData,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"view" | "delete">("view");
  const router = useRouter();

  const hasPaymentRecord = !!billTrackerData.billPaymentId;

  const handleEdit = () => {
    if (hasPaymentRecord && billTrackerData.billPaymentId) {
      router.push(
        `/accounting-and-finance/billing/edit/${billTrackerData.billPaymentId}`
      );
    } else {
      toast.error("No direct payment record to edit.");
    }
  };

  const handleView = () => {
    if (hasPaymentRecord) {
      setMode("view");
      setOpenDialog(true);
    } else {
      toast.error("No payment record to view for this purchase.");
    }
  };

  const handleDeleteClick = () => {
    if (hasPaymentRecord) {
      setMode("delete");
      setOpenDialog(true);
    } else {
      toast.error("No payment record to delete for this purchase.");
    }
  };

  const handlePayBill = () => {
    router.push(
      `/accounting-and-finance/billing/pay-bill?purchaseId=${billTrackerData.purchase.id}`
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <EllipsisVertical className="w-10 h-10 hover:bg-white cursor-pointer p-2 rounded-full" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 bg-white py-4 px-2" align="end">
          {hasPaymentRecord ? (
            <>
              {billTrackerData.paymentStatus === PaymentStatus.Partial && (
                <DropdownMenuItem
                  onClick={handlePayBill}
                  className="text-blue-800 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
                >
                  <Wallet className="mr-2 h-4 w-4" /> Record Payment
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleView}
                className="text-green-500 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" /> <span>View Payment</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleEdit}
                className="text-[#475BE8] p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              >
                <EditIcon className="mr-2 h-4 w-4" /> Edit Payment
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="text-red-600 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
              >
                <DeleteIcon className="mr-2 h-4 w-4" /> Deactivate Payment
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              onClick={handlePayBill}
              className="text-blue-800 p-2 flex items-center gap-2 hover:bg-light-200 hover:rounded-md cursor-pointer"
            >
              <Wallet className="mr-2 h-4 w-4" /> Record Payment
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Render the dialog conditionally */}
      {openDialog &&
        hasPaymentRecord && ( // Only open dialog if there's a payment record
          <BillPaymentDialog
            mode={mode}
            open={openDialog}
            onOpenChange={setOpenDialog}
            billTrackerData={billTrackerData}
          />
        )}
    </>
  );
};

export default BillPaymentActions;
