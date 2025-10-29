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
import { IncomeTrackerRecord } from "@/types"; // Your IncomeTrackerRecord type
import SalePaymentDialog from "./SalePaymentDialog";
import EditIcon from "@mui/icons-material/Edit"; // Assuming MUI icons are integrated
import DeleteIcon from "@mui/icons-material/Delete";
import toast from "react-hot-toast";

interface SalePaymentActionsProps {
  incomeTrackerData: IncomeTrackerRecord;
}

const SalePaymentActions: React.FC<SalePaymentActionsProps> = ({
  incomeTrackerData,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [mode, setMode] = useState<"view" | "delete">("view");
  const router = useRouter();

  // A paymentId indicates a Payment Received record exists for this sale
  const hasPaymentRecord = !!incomeTrackerData.paymentId;

  const handleEdit = () => {
    if (hasPaymentRecord && incomeTrackerData.paymentId) {
      router.push(
        `/accounting-and-finance/income/edit/${incomeTrackerData.paymentId}`
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
      toast.error("No payment record to view for this sale.");
    }
  };

  const handleDeleteClick = () => {
    if (hasPaymentRecord) {
      setMode("delete");
      setOpenDialog(true);
    } else {
      toast.error("No payment record to deactivate for this sale.");
    }
  };

  const handleRecordPayment = () => {
    // Navigate to a page to record a new payment for this specific sale
    router.push(
      `/accounting-and-finance/income/record-income?sourceSaleId=${incomeTrackerData.sale.id}`
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
              onClick={handleRecordPayment}
              className="flex items-center cursor-pointer"
            >
              <Wallet className="mr-2 h-4 w-4" /> Record Payment
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Render the dialog conditionally */}
      {openDialog && hasPaymentRecord && (
        <SalePaymentDialog
          mode={mode}
          open={openDialog}
          onOpenChange={setOpenDialog}
          incomeTrackerData={incomeTrackerData}
        />
      )}
    </>
  );
};

export default SalePaymentActions;
