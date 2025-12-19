"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AccountWithRelations } from "@/types";
import { useAccounts } from "@/hooks/useAccounts";
import toast from "react-hot-toast";
import { cn, formatDateTime } from "@/lib/utils";
import FormatNumber from "@/components/FormatNumber";
import { useRouter } from "next/navigation";
import EditIcon from "@mui/icons-material/Edit";

interface AccountDialogProps {
  mode: "add" | "view" | "delete";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountWithRelations;
}

const AccountDialog: React.FC<AccountDialogProps> = ({
  mode,
  open,
  onOpenChange,
  account,
}) => {
  const { softDeleteAccount, isSoftDeletingAccount } = useAccounts();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      if (account?.account?.id) {
        await softDeleteAccount(account.account.id, {
          onSuccess: () => {
            toast.success("Financial Account deactivated successfully.");
            onOpenChange(false);
          },
          onError: (error) => {
            console.error("Error deactivating account:", error);
            toast.error(error.message || "Failed to deactivate account.");
          },
        });
      } else {
        throw new Error("Account ID is required for deletion.");
      }
    } catch (error) {
      console.error("Error during delete operation:", error);
      toast.error("An unexpected error occurred during deactivation.");
    }
  };

  const handleEdit = () => {
    if (account?.account?.id) {
      router.push(
        `/accounting-and-finance/banking/edit-account/${account.account.id}`
      );
      onOpenChange(false);
    }
  };

  if (!account?.account) {
    return null;
  }

  return (
    <>
      {mode === "delete" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className="sm:max-w-xl bg-light-200"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onInteractOutside={(e) => {
              if (e.target instanceof Element) {
                if (
                  e.target.closest('[role="listbox"]') ||
                  e.target.closest("[data-radix-select-viewport]") ||
                  e.target.closest("[data-radix-popper-content]")
                ) {
                  e.preventDefault();
                  return;
                }
              }

              const event = e.detail.originalEvent;
              if (event instanceof PointerEvent) {
                event.stopPropagation();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl text-blue-800">
                Deactivate Account
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                Are you sure you want to deactivate this financial account? This
                action will prevent further transactions but will preserve
                historical data.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSoftDeletingAccount}
                className="shad-primary-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSoftDeletingAccount}
                className="shad-danger-btn"
              >
                Deactivate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {mode === "view" && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className="sm:max-w-3xl bg-light-200"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onInteractOutside={(e) => {
              if (e.target instanceof Element) {
                if (
                  e.target.closest('[role="listbox"]') ||
                  e.target.closest("[data-radix-select-viewport]") ||
                  e.target.closest("[data-radix-popper-content]")
                ) {
                  e.preventDefault();
                  return;
                }
              }

              const event = e.detail.originalEvent;
              if (event instanceof PointerEvent) {
                event.stopPropagation();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl text-blue-800">
                {`Account Details: ${account.account.name}`}
              </DialogTitle>
              <DialogDescription className="text-dark-500">
                {`Details for ${account.account.name} (${account.account.accountNumber}).`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex w-full flex-col gap-2 pt-2">
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Account Name:</p>
                <p className="col-span-3">{account.account.name}</p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Account Number:</p>
                <p className="col-span-3">
                  {account.account.accountNumber || "-"}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Account Type:</p>
                <p className="capitalize col-span-3">
                  {account.account.accountType.replace(/_/g, " ")}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Currency:</p>
                <p className="col-span-3">{account.account.currency}</p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Opening Balance:</p>
                <p className="col-span-3">
                  <FormatNumber value={account.account.openingBalance} />
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Current Balance:</p>
                <p className="col-span-3">
                  <FormatNumber value={account.account.currentBalance} />
                </p>
              </div>
              {account.account.bankName && (
                <div className="grid grid-cols-4 gap-4">
                  <p className="font-semibold">Bank Name:</p>
                  <p className="col-span-3">{account.account.bankName}</p>
                </div>
              )}
              {account.account.swiftCode && (
                <div className="grid grid-cols-4 gap-4">
                  <p className="font-semibold">SWIFT Code:</p>
                  <p className="col-span-3">{account.account.swiftCode}</p>
                </div>
              )}
              {account.account.merchantCode && (
                <div className="grid grid-cols-4 gap-4">
                  <p className="font-semibold">Merchant Code:</p>
                  <p className="col-span-3">{account.account.merchantCode}</p>
                </div>
              )}
              {account.account.bankAddress?.address && (
                <div className="col-span-2">
                  <p className="font-semibold">Bank Address:</p>
                  <p className="col-span-3">
                    {account.account.bankAddress?.addressName
                      ? `${account.account.bankAddress.addressName}, `
                      : ""}
                    {account.account.bankAddress?.address},{" "}
                    {account.account.bankAddress?.city},{" "}
                    {account.account.bankAddress?.state},{" "}
                    {account.account.bankAddress?.country}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Linked CoA:</p>
                <p className="col-span-3">
                  {account.chartOfAccount?.accountName}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Status:</p>
                <p className="col-span-3">
                  <span
                    className={cn(
                      "text-14-medium capitalize",
                      account.account.isActive ? "bg-green-500" : "bg-red-600",
                      "text-white px-3 py-1 rounded-xl"
                    )}
                  >
                    {account.account.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Created At:</p>
                <p className="col-span-3">
                  {formatDateTime(account.account.createdAt).dateTime}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <p className="font-semibold">Last Updated:</p>
                <p className="col-span-3">
                  {formatDateTime(account.account.updatedAt).dateTime}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="shad-danger-btn"
              >
                Close
              </Button>

              <Button
                type="button"
                onClick={handleEdit}
                className="shad-primary-btn"
              >
                <EditIcon className="h-5 w-5 mr-2" /> Edit Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AccountDialog;
